"""Complete reporting schema, including existing manually provisioned databases."""
from alembic import op

revision = 'e42a08f19c31'
down_revision = 'b6a7bd5d8ca0'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS chat_id VARCHAR(50)')
    op.execute('ALTER TABLE subscribers ALTER COLUMN phone_number TYPE VARCHAR(50)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_subscribers_chat_id ON subscribers (chat_id)')
    op.execute('''CREATE TABLE IF NOT EXISTS report_logs (
        log_id SERIAL PRIMARY KEY,
        week_key VARCHAR(20) NOT NULL UNIQUE,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        recipients_count INTEGER NOT NULL DEFAULT 0
    )''')

def downgrade():
    # Preserve delivery history and identifiers; destructive rollback must be planned explicitly.
    pass
