from decimal import Decimal

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal


class CategoryTotalOut(BaseModel):
    category: str
    total_amount: Decimal


class MonthlyTrendOut(BaseModel):
    month: str
    total_income: Decimal
    total_expense: Decimal
