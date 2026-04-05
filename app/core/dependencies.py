from collections.abc import Callable
from typing import Any

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.models.user import User, UserRole


def require_role(*roles: UserRole | str) -> Callable[..., User]:
    allowed_roles = {role.value if isinstance(role, UserRole) else role for role in roles}

    def dependency(
        authorization: str = Header(..., alias="Authorization"),
        db: Session = Depends(get_db),
    ) -> User:
        if settings.demo_auth_bypass:
            return User(
                id=0,
                name="Demo User",
                email="demo@example.com",
                hashed_password="",
                role=UserRole.ADMIN,
                is_active=True,
            )

        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header",
            )

        token = authorization.split(" ", 1)[1].strip()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
            )

        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            subject = payload.get("sub")
            if subject is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload",
                )

            user = db.query(User).filter(User.id == int(subject)).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )
        except (JWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permissions",
            )

        return user

    return dependency
