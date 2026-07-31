"""add departments and document department tagging

Revision ID: 72d0d2c8863c
Revises: d47a7a6c5b45
Create Date: 2026-07-31 21:43:10.258308

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72d0d2c8863c'
down_revision: Union[str, Sequence[str], None] = 'd47a7a6c5b45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'departments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_departments_id'), 'departments', ['id'], unique=False)
    op.create_index(op.f('ix_departments_organization_id'), 'departments', ['organization_id'], unique=False)

    op.create_table(
        'user_departments',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.PrimaryKeyConstraint('user_id', 'department_id'),
    )

    op.add_column('documents', sa.Column('department_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'documents', 'departments', ['department_id'], ['id'])
    op.create_index(op.f('ix_documents_department_id'), 'documents', ['department_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_documents_department_id'), table_name='documents')
    op.drop_constraint(None, 'documents', type_='foreignkey')
    op.drop_column('documents', 'department_id')

    op.drop_table('user_departments')

    op.drop_index(op.f('ix_departments_organization_id'), table_name='departments')
    op.drop_index(op.f('ix_departments_id'), table_name='departments')
    op.drop_table('departments')