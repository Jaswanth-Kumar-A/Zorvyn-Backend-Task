from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import require_role
from app.core.security import create_access_token, hash_password, verify_password
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.auth import AuthResponse, Token, UserLogin, UserRegister


router = APIRouter(prefix="/auth", tags=["auth"])


def build_auth_response(user: User) -> AuthResponse:
    token = create_access_token(subject=str(user.id))
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return build_auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    if settings.demo_auth_bypass:
        user = db.query(User).filter(User.email == payload.email).first()

        if user is None:
            user = User(
                name=(payload.email.split("@", 1)[0] or "Demo User").replace(".", " ").title(),
                email=payload.email,
                hashed_password=hash_password(payload.password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(user)
        else:
            user.name = user.name or (payload.email.split("@", 1)[0] or "Demo User").replace(".", " ").title()
            user.hashed_password = hash_password(payload.password)
            user.role = UserRole.ADMIN
            user.is_active = True

        db.commit()
        db.refresh(user)
        return build_auth_response(user)

    user = db.query(User).filter(User.email == payload.email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    return build_auth_response(user)


@router.get("/admin-analyst-only")
def admin_analyst_only(
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
) -> dict[str, str]:
    return {
        "message": "Access granted to privileged analytics endpoint.",
        "email": current_user.email,
        "role": current_user.role.value,
    }
