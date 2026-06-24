"""dummy placeholder migration

Revision ID: d6a7bce5c6fd
Revises: 0ecfa3a31e79
Create Date: 2026-06-23 18:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6a7bce5c6fd'
down_revision: Union[str, Sequence[str], None] = '0ecfa3a31e79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Placeholder upgrade."""
    pass


def downgrade() -> None:
    """Placeholder downgrade."""
    pass
