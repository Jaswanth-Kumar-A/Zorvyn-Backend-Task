import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.db.database import engine
from app.models.base import Base
from app.models import user  # noqa: F401
from app.models import transaction  # noqa: F401
from app.models import record  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.records import router as records_router
from app.routers.transactions import router as transaction_router


app = FastAPI(title="Finance Dashboard API")
logger = logging.getLogger("uvicorn.error")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return JSONResponse(
            status_code=404,
            content={"message": "Resource not found", "path": str(request.url.path)},
        )
    if exc.status_code == 401:
        return JSONResponse(status_code=401, content={"message": "Unauthorized"})
    if exc.status_code == 403:
        return JSONResponse(status_code=403, content={"message": "Forbidden"})

    detail = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    return JSONResponse(status_code=exc.status_code, content={"message": detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = []
    for error in exc.errors():
        field = ".".join(str(part) for part in error.get("loc", []) if part != "body")
        errors.append(
            {
                "field": field or "request",
                "message": error.get("msg", "Invalid value"),
            }
        )

    return JSONResponse(
        status_code=422,
        content={
            "message": "Validation failed",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(transaction_router)
app.include_router(records_router)
app.include_router(dashboard_router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Finance Dashboard API is running."}
