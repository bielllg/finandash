import pytest
from httpx import ASGITransport, AsyncClient
from src.main import app, _rate_store

@pytest.mark.asyncio
async def test_api_rejects_untrusted_origin_and_large_body():
    _rate_store.clear()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post('/api/features/simulate', json={}, headers={'Origin': 'https://untrusted.example'})
        assert response.status_code == 403
        response = await client.post('/api/features/simulate', content='x' * 16385, headers={'Content-Type': 'application/json'})
        assert response.status_code == 413

@pytest.mark.asyncio
async def test_simulation_validation_and_subscription_safety():
    _rate_store.clear()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        valid = dict(initial_amount=1000, monthly_contribution=100, annual_rate=0, years=1)
        response = await client.post('/api/features/simulate', json=valid)
        assert response.status_code == 200
        assert response.json()['data'][-1]['total_amount'] == 2200
        assert (await client.post('/api/features/simulate', json={**valid, 'admin': True})).status_code == 422
        assert (await client.post('/api/features/alerts/subscribe', json={'telegram_user': '@someone'})).status_code == 503
