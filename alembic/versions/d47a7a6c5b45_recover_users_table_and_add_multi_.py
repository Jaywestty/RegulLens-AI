"""recover users table and add multi-tenant organizations

Revision ID: d47a7a6c5b45
Revises: 9107cd97a864
Create Date: 2026-07-31 16:23:54.174001

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd47a7a6c5b45'
down_revision: Union[str, Sequence[str], None] = '10905760c429'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TYPE IF EXISTS userrole")
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('admin', 'hr', 'employee', name='userrole'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    op.add_column('users', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'users', 'organizations', ['organization_id'], ['id'])

    op.execute("DELETE FROM query_logs")
    op.execute("DELETE FROM conversations")
    op.execute("DELETE FROM documents")

    op.add_column('documents', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'documents', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key(None, 'documents', 'users', ['uploaded_by'], ['id'])

    op.add_column('conversations', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'conversations', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key(None, 'conversations', 'users', ['user_id'], ['id'])

    op.add_column('query_logs', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'query_logs', 'organizations', ['organization_id'], ['id'])
    op.create_foreign_key(None, 'query_logs', 'users', ['user_id'], ['id'])

    op.execute(
        "INSERT INTO organizations (name, slug) VALUES ('Default Organization', 'default-organization')"
    )
    op.execute(
        "UPDATE documents SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-organization')"
    )
    op.execute(
        "UPDATE conversations SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-organization')"
    )
    op.execute(
        "UPDATE query_logs SET organization_id = (SELECT id FROM organizations WHERE slug = 'default-organization')"
    )

    op.alter_column('documents', 'organization_id', nullable=False)
    op.alter_column('conversations', 'organization_id', nullable=False)
    op.alter_column('query_logs', 'organization_id', nullable=False)


def downgrade() -> None:
    op.drop_constraint(None, 'query_logs', type_='foreignkey')
    op.drop_constraint(None, 'query_logs', type_='foreignkey')
    op.drop_column('query_logs', 'organization_id')

    op.drop_constraint(None, 'conversations', type_='foreignkey')
    op.drop_constraint(None, 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'organization_id')

    op.drop_constraint(None, 'documents', type_='foreignkey')
    op.drop_constraint(None, 'documents', type_='foreignkey')
    op.drop_column('documents', 'organization_id')

    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_column('users', 'organization_id')

    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')