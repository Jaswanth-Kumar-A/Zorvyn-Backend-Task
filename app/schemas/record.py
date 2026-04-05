from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.record import RecordType


class RecordCreate(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    amount: Decimal = Field(gt=0)
    type: RecordType
    description: str | None = Field(default=None, max_length=2000)


class RecordUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    amount: Decimal | None = Field(default=None, gt=0)
    type: RecordType | None = None
    description: str | None = Field(default=None, max_length=2000)


class RecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    amount: Decimal
    type: RecordType
    description: str | None
    created_at: datetime


class RecordDeleteResponse(BaseModel):
    message: str
    record: RecordOut
