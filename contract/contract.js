import { Contract } from 'trac-peer';

const VALID_TRANSITIONS = {
  open: ['funded', 'cancelled'],
  funded: ['delivered', 'disputed', 'refunded'],
  delivered: ['released', 'disputed'],
  disputed: ['released', 'refunded'],
  released: [],
  refunded: [],
  cancelled: [],
};

class EscrowMeshContract extends Contract {
  constructor(protocol, options = {}) {
    super(protocol, options);

    this.addSchema('dealCreate', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        title: { type: 'string', min: 3, max: 160 },
        amount: { type: 'string', min: 1, max: 64 },
        asset: { type: 'string', min: 1, max: 32 },
        buyer: { type: 'string', min: 3, max: 128, optional: true },
        seller: { type: 'string', min: 3, max: 128, optional: true },
        arbiter: { type: 'string', min: 3, max: 128, optional: true },
        terms: { type: 'string', min: 1, max: 4000, optional: true },
        channel: { type: 'string', min: 1, max: 160, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealFund', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        fundRef: { type: 'string', min: 1, max: 256, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealDeliver', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        proof: { type: 'string', min: 1, max: 8000, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealRelease', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        txRef: { type: 'string', min: 1, max: 256, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealRefund', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        reason: { type: 'string', min: 1, max: 1200, optional: true },
        txRef: { type: 'string', min: 1, max: 256, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealDispute', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        reason: { type: 'string', min: 1, max: 1200 },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealResolve', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        resolution: { type: 'string', min: 1, max: 32 },
        note: { type: 'string', min: 1, max: 1200, optional: true },
        txRef: { type: 'string', min: 1, max: 256, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('dealCancel', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
        reason: { type: 'string', min: 1, max: 1200, optional: true },
        ts: { type: 'number', integer: true, optional: true },
      },
    });

    this.addSchema('readDeal', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        dealId: { type: 'string', min: 3, max: 64 },
      },
    });

    this.addSchema('listDeals', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        limit: { type: 'number', integer: true, min: 1, max: 200, optional: true },
      },
    });

    this.addSchema('listDealsByStatus', {
      value: {
        $$strict: true,
        $$type: 'object',
        op: { type: 'string', min: 1, max: 64 },
        status: { type: 'string', min: 1, max: 64 },
        limit: { type: 'number', integer: true, min: 1, max: 200, optional: true },
      },
    });

    this.addFunction('readSnapshot');
    this.addFunction('readTimer');

    this.addSchema('feature_entry', {
      key: { type: 'string', min: 1, max: 256 },
      value: { type: 'any' },
    });

    const _this = this;
    this.addFeature('timer_feature', async function () {
      if (_this.check.validateSchema('feature_entry', _this.op) === false) return;
      if (_this.op.key === 'currentTime') {
        await _this.put('currentTime', _this.op.value);
      }
    });
  }

  _dealKey(dealId) {
    return `deal/${dealId}`;
  }

  _normalizeDealId(rawDealId) {
    return String(rawDealId || '').trim();
  }

  async _now() {
    const timerTime = await this.get('currentTime');
    if (typeof timerTime === 'number') return timerTime;
    const fromTx = Number.parseInt(String(this.value?.ts ?? ''), 10);
    return Number.isFinite(fromTx) ? fromTx : null;
  }

  async _readDeal(dealId) {
    return await this.get(this._dealKey(dealId));
  }

  async _readDealIndex() {
    const index = await this.get('deal_index');
    return Array.isArray(index) ? index : [];
  }

  async _writeDeal(dealId, deal) {
    await this.put(this._dealKey(dealId), deal);
    await this.put('deal_last', deal);
  }

  _canTransition(from, to) {
    if (!from || !to) return false;
    const next = VALID_TRANSITIONS[from] || [];
    return next.includes(to);
  }

  _isCreator(deal) {
    return deal?.createdBy && this.address && deal.createdBy === this.address;
  }

  _isBuyer(deal) {
    return deal?.buyer && this.address && deal.buyer === this.address;
  }

  _isSeller(deal) {
    return deal?.seller && this.address && deal.seller === this.address;
  }

  _isArbiter(deal) {
    return deal?.arbiter && this.address && deal.arbiter === this.address;
  }

  _hasRole(deal) {
    return this._isCreator(deal) || this._isBuyer(deal) || this._isSeller(deal) || this._isArbiter(deal);
  }

  async dealCreate() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');

    const existing = await this._readDeal(dealId);
    if (existing !== null) return new Error(`Deal already exists: ${dealId}`);
    if (!this.address) return new Error('Missing sender address.');

    const buyer = this.value?.buyer ? String(this.value.buyer).trim() : this.address;
    const seller = this.value?.seller ? String(this.value.seller).trim() : null;
    if (!seller) return new Error('Missing seller.');

    const now = await this._now();
    const deal = {
      dealId,
      title: String(this.value?.title || '').trim(),
      amount: String(this.value?.amount || '').trim(),
      asset: String(this.value?.asset || '').trim(),
      buyer,
      seller,
      arbiter: this.value?.arbiter ? String(this.value.arbiter).trim() : null,
      terms: this.value?.terms ? String(this.value.terms).trim() : null,
      channel: this.value?.channel ? String(this.value.channel).trim() : null,
      status: 'open',
      createdBy: this.address,
      createdAt: now,
      updatedAt: now,
      fundedAt: null,
      deliveredAt: null,
      resolvedAt: null,
      cancelledAt: null,
      fundRef: null,
      deliveryProof: null,
      dispute: null,
      resolution: null,
    };

    const index = await this._readDealIndex();
    if (index.includes(dealId) === false) index.push(dealId);

    await this._writeDeal(dealId, deal);
    await this.put('deal_index', index);

    console.log('deal_create ok', { dealId, createdBy: this.address });
  }

  async dealFund() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    if (!this._isBuyer(deal) && !this._isCreator(deal)) {
      return new Error('Only buyer or creator can mark funded.');
    }
    if (deal.status !== 'open') return new Error(`Deal is not open: ${deal.status}`);
    if (!this._canTransition(deal.status, 'funded')) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = 'funded';
    deal.fundRef = this.value?.fundRef ? String(this.value.fundRef).trim() : null;
    deal.fundedAt = now;
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_fund ok', { dealId, by: this.address });
  }

  async dealDeliver() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    if (!this._isSeller(deal)) return new Error('Only seller can mark delivered.');
    if (deal.status !== 'funded') return new Error(`Deal is not funded: ${deal.status}`);
    if (!this._canTransition(deal.status, 'delivered')) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = 'delivered';
    deal.deliveryProof = this.value?.proof ? String(this.value.proof).trim() : null;
    deal.deliveredAt = now;
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_deliver ok', { dealId, by: this.address });
  }

  async dealRelease() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    const fromDispute = deal.status === 'disputed';
    const canRelease =
      (deal.status === 'delivered' && this._isBuyer(deal)) ||
      (fromDispute && (this._isArbiter(deal) || this._isBuyer(deal)));
    if (!canRelease) return new Error('Only buyer (or arbiter in dispute) can release.');
    if (!this._canTransition(deal.status, 'released')) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = 'released';
    deal.resolution = {
      action: 'released',
      by: this.address,
      txRef: this.value?.txRef ? String(this.value.txRef).trim() : null,
      note: fromDispute ? 'resolved from dispute' : 'buyer released',
      at: now,
    };
    deal.resolvedAt = now;
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_release ok', { dealId, by: this.address });
  }

  async dealRefund() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    const fromDispute = deal.status === 'disputed';
    const canRefund =
      (deal.status === 'funded' && this._isSeller(deal)) ||
      (fromDispute && this._isArbiter(deal));
    if (!canRefund) return new Error('Only seller (or arbiter in dispute) can refund.');
    if (!this._canTransition(deal.status, 'refunded')) return new Error('Invalid state transition.');

    const now = await this._now();
    const reason = this.value?.reason ? String(this.value.reason).trim() : null;
    deal.status = 'refunded';
    deal.resolution = {
      action: 'refunded',
      by: this.address,
      txRef: this.value?.txRef ? String(this.value.txRef).trim() : null,
      note: reason,
      at: now,
    };
    deal.resolvedAt = now;
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_refund ok', { dealId, by: this.address });
  }

  async dealDispute() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    if (!this._isBuyer(deal) && !this._isSeller(deal)) {
      return new Error('Only buyer or seller can open dispute.');
    }
    if (deal.status !== 'funded' && deal.status !== 'delivered') {
      return new Error(`Deal cannot be disputed from: ${deal.status}`);
    }
    if (!this._canTransition(deal.status, 'disputed')) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = 'disputed';
    deal.dispute = {
      openedBy: this.address,
      reason: String(this.value?.reason || '').trim(),
      at: now,
    };
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_dispute ok', { dealId, by: this.address });
  }

  async dealResolve() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    if (deal.status !== 'disputed') return new Error(`Deal is not disputed: ${deal.status}`);
    if (!this._isArbiter(deal)) return new Error('Only arbiter can resolve dispute.');

    const resolution = String(this.value?.resolution || '').trim().toLowerCase();
    if (resolution !== 'release' && resolution !== 'refund') {
      return new Error('resolution must be "release" or "refund".');
    }

    const targetState = resolution === 'release' ? 'released' : 'refunded';
    if (!this._canTransition(deal.status, targetState)) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = targetState;
    deal.resolution = {
      action: targetState,
      by: this.address,
      note: this.value?.note ? String(this.value.note).trim() : null,
      txRef: this.value?.txRef ? String(this.value.txRef).trim() : null,
      at: now,
    };
    deal.resolvedAt = now;
    deal.updatedAt = now;

    await this._writeDeal(dealId, deal);
    console.log('deal_resolve ok', { dealId, by: this.address, targetState });
  }

  async dealCancel() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');
    if (!this.address) return new Error('Missing sender address.');

    const deal = await this._readDeal(dealId);
    if (deal === null) return new Error(`Deal not found: ${dealId}`);
    if (!this._isCreator(deal) && !this._isBuyer(deal)) {
      return new Error('Only creator or buyer can cancel.');
    }
    if (deal.status !== 'open') return new Error(`Deal can only be cancelled from open: ${deal.status}`);
    if (!this._canTransition(deal.status, 'cancelled')) return new Error('Invalid state transition.');

    const now = await this._now();
    deal.status = 'cancelled';
    deal.cancelledAt = now;
    deal.updatedAt = now;
    deal.resolution = {
      action: 'cancelled',
      by: this.address,
      note: this.value?.reason ? String(this.value.reason).trim() : null,
      at: now,
    };

    await this._writeDeal(dealId, deal);
    console.log('deal_cancel ok', { dealId, by: this.address });
  }

  async readDeal() {
    const dealId = this._normalizeDealId(this.value?.dealId);
    if (!dealId) return new Error('Missing dealId.');

    const deal = await this._readDeal(dealId);
    console.log('read_deal', { dealId, deal });
  }

  async listDeals() {
    const index = await this._readDealIndex();
    const requested = Number.parseInt(String(this.value?.limit ?? '20'), 10);
    const limit = Number.isFinite(requested) ? Math.max(1, Math.min(requested, 200)) : 20;
    const items = [];
    for (let i = index.length - 1; i >= 0 && items.length < limit; i -= 1) {
      const dealId = index[i];
      const deal = await this._readDeal(dealId);
      if (deal !== null) items.push(deal);
    }
    console.log('list_deals', { total: index.length, limit, items });
  }

  async listDealsByStatus() {
    const status = String(this.value?.status || '').trim().toLowerCase();
    if (!status) return new Error('Missing status.');

    const index = await this._readDealIndex();
    const requested = Number.parseInt(String(this.value?.limit ?? '20'), 10);
    const limit = Number.isFinite(requested) ? Math.max(1, Math.min(requested, 200)) : 20;
    const items = [];
    for (let i = index.length - 1; i >= 0 && items.length < limit; i -= 1) {
      const dealId = index[i];
      const deal = await this._readDeal(dealId);
      if (deal !== null && String(deal.status || '').toLowerCase() === status) {
        items.push(deal);
      }
    }
    console.log('list_deals_by_status', { status, total: items.length, limit, items });
  }

  async readSnapshot() {
    const currentTime = await this.get('currentTime');
    const dealIndex = await this._readDealIndex();
    const dealLast = await this.get('deal_last');
    console.log('deal_snapshot', {
      dealCount: dealIndex.length,
      dealLast,
      currentTime,
    });
  }

  async readTimer() {
    const currentTime = await this.get('currentTime');
    console.log('currentTime:', currentTime);
  }
}

export default EscrowMeshContract;
