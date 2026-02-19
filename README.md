# Amanah Escrow

Amanah Escrow is designed for two-party work agreements where funds are secured first, deliverables are verified, and then released or refunded.

## Maintainer Address
`trac1qljyx6lnn5xyg268nrwqjdj6q9pap6eq4ecgugrqglu7sle8yhysr5d89w`

## Product Proof
![Amanah Escrow Product Screenshot](./assets/product-screenshot.png)

## Escrow Workflow (Practical)
### Phase 1 - Opening
- `deal_create`: create the deal and terms.
- `deal_fund`: attach funding reference.

### Phase 2 - Delivery
- `deal_deliver`: submit final result/proof.
- `deal_dispute`: open a dispute when outcomes diverge.

### Phase 3 - Closing
- `deal_release`: release funds to the receiver.
- `deal_refund`: return funds to the payer.
- `deal_resolve`: finalize dispute decision.
- `deal_cancel`: cancel a deal before completion.

## Runtime
```bash
pear run . --peer-store-name admin --msb-store-name admin-msb --subnet-channel amanah-escrow-v1
```

## Terminal Tooling
```text
/deal_examples
/deal_wizard
```

## References
- Fork source: https://github.com/Trac-Systems/intercom
- Awesome list target: https://github.com/Trac-Systems/awesome-intercom
