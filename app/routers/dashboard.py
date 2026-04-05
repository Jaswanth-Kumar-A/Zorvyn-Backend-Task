from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.transaction import Transaction, TransactionType
from app.schemas.dashboard import CategoryTotalOut, DashboardSummaryOut, MonthlyTrendOut
from app.schemas.transaction import TransactionOut


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def get_summary(
    db: Session = Depends(get_db),
) -> DashboardSummaryOut:
    total_income, total_expenses = db.query(
        func.coalesce(
            func.sum(case((Transaction.type == TransactionType.INCOME, Transaction.amount), else_=0)),
            0,
        ),
        func.coalesce(
            func.sum(case((Transaction.type == TransactionType.EXPENSE, Transaction.amount), else_=0)),
            0,
        ),
    ).filter(Transaction.is_deleted.is_(False)).one()

    income = Decimal(total_income or 0)
    expenses = Decimal(total_expenses or 0)
    return DashboardSummaryOut(
        total_income=income,
        total_expenses=expenses,
        net_balance=income - expenses,
    )


@router.get("/by-category", response_model=list[CategoryTotalOut])
def get_by_category(
    db: Session = Depends(get_db),
) -> list[CategoryTotalOut]:
    rows = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0).label("total_amount"),
        )
        .filter(Transaction.is_deleted.is_(False))
        .group_by(Transaction.category)
        .order_by(Transaction.category.asc())
        .all()
    )

    return [
        CategoryTotalOut(category=row.category, total_amount=Decimal(row.total_amount or 0))
        for row in rows
    ]


@router.get("/monthly-trend", response_model=list[MonthlyTrendOut])
def get_monthly_trend(
    db: Session = Depends(get_db),
) -> list[MonthlyTrendOut]:
    month_key = func.date_format(Transaction.date, "%Y-%m")

    rows = (
        db.query(
            month_key.label("month"),
            func.coalesce(
                func.sum(case((Transaction.type == TransactionType.INCOME, Transaction.amount), else_=0)),
                0,
            ).label("total_income"),
            func.coalesce(
                func.sum(case((Transaction.type == TransactionType.EXPENSE, Transaction.amount), else_=0)),
                0,
            ).label("total_expense"),
        )
        .filter(Transaction.is_deleted.is_(False))
        .group_by(month_key)
        .order_by(month_key.asc())
        .all()
    )

    return [
        MonthlyTrendOut(
            month=row.month,
            total_income=Decimal(row.total_income or 0),
            total_expense=Decimal(row.total_expense or 0),
        )
        for row in rows
    ]


@router.get("/recent", response_model=list[TransactionOut])
def get_recent_transactions(
    db: Session = Depends(get_db),
) -> list[TransactionOut]:
    return (
        db.query(Transaction)
        .filter(Transaction.is_deleted.is_(False))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc(), Transaction.id.desc())
        .limit(10)
        .all()
    )
