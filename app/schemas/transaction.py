import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.transaction import TransactionType


class TransactionBase(BaseModel):
    user_id: int = Field(gt=0)
    amount: Decimal
    type: TransactionType
    category: str = Field(min_length=1, max_length=100)
    date: dt.date
    notes: str | None = Field(default=None, max_length=2000)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    user_id: int | None = Field(default=None, gt=0)
    amount: Decimal | None = None
    type: TransactionType | None = None
    category: str | None = Field(default=None, min_length=1, max_length=100)
    date: dt.date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    type: TransactionType
    category: str
    date: dt.date
    notes: str | None
    is_deleted: bool
    created_at: dt.datetime
