"""Durable queue and explicit Telegram consent."""
from alembic import op

revision = 'f1530c81d299'
down_revision = 'e42a08f19c31'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS consented_at TIMESTAMPTZ')
    op.execute('''CREATE TABLE IF NOT EXISTS report_jobs (
        job_key VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ
    )''')

def downgrade():
    # Delivery records are retained to prevent accidental replays after rollback.
    pass
