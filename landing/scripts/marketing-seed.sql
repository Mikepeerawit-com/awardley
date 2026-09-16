-- Data behind landing/public/screenshot-tender.png (#183). Fictional client, suppliers and
-- person. Apply to a fresh local database after creating the Org Admin at /setup, then
-- capture the Tender at 390x844, 3x, light, en. There is no seed.sql in this repo.

-- Marketing screenshot data. Every name here is invented.
begin;

do $$
declare
  v_org uuid;
  v_admin uuid;
  v_tender uuid;
  s_siamlotus uuid; s_nanhai uuid; s_blueorchid uuid; s_pakdee uuid; s_khlongtan uuid;
  i1 uuid; i2 uuid; i3 uuid; i4 uuid;
  q uuid;
begin
  select id into v_org from orgs limit 1;
  select id into v_admin from users where is_org_admin order by created_at limit 1;

  insert into suppliers (org_id, name, country) values
    (v_org, 'Siam Lotus Medical Supply Co., Ltd.', 'TH') returning id into s_siamlotus;
  insert into suppliers (org_id, name, country) values
    (v_org, 'Nanhai Brightpath Medical Co., Ltd.', 'CN') returning id into s_nanhai;
  insert into suppliers (org_id, name, country) values
    (v_org, 'Blue Orchid Surgical Co., Ltd.', 'TH') returning id into s_blueorchid;
  insert into suppliers (org_id, name, country) values
    (v_org, 'Pakdee Healthcare Trading Co., Ltd.', 'TH') returning id into s_pakdee;
  insert into suppliers (org_id, name, country) values
    (v_org, 'Khlong Tan Medtech Import Co., Ltd.', 'TH') returning id into s_khlongtan;

  insert into fx_rates (currency, as_of, rate_to_thb, fetched_at) values
    ('CNY', date '2026-09-15', 4.9138, now()),
    ('USD', date '2026-09-15', 35.4120, now())
  on conflict do nothing;

  insert into tenders (
    org_id, client_name, title, date_received, internal_quote_deadline,
    client_submission_deadline, expected_decision_date, owner_user_id, notes
  ) values (
    v_org,
    'Bua Luang General Hospital',
    'Annual consumables framework, Q4 2026',
    date '2026-09-08', date '2026-09-18', date '2026-09-24', date '2026-10-09',
    v_admin,
    'Framework runs twelve months from award. Partial bids accepted per line.'
  ) returning id into v_tender;

  -- Item 1: quoted three ways, nothing chosen yet -> opens by default on the sheet.
  insert into tender_items (org_id, tender_id, product_name, description, quantity, unit, ordinal)
    values (v_org, v_tender, 'Nitrile examination gloves, powder-free, size M',
            'Box of 100. Blue, textured fingertips.', 4000, 'box', 1)
    returning id into i1;

  -- Item 2: decided, with landed cost and a selling price.
  insert into tender_items (org_id, tender_id, product_name, description, quantity, unit, ordinal)
    values (v_org, v_tender, 'Surgical face mask, 3-ply Type IIR, earloop',
            'Box of 50. Fluid-resistant.', 1200, 'box', 2)
    returning id into i2;

  insert into tender_items (org_id, tender_id, product_name, description, quantity, unit, ordinal)
    values (v_org, v_tender, 'Disposable syringe, 5 ml, luer lock',
            'Sterile, single use, with 21G needle.', 60000, 'piece', 3)
    returning id into i3;

  insert into tender_items (org_id, tender_id, product_name, description, quantity, unit, ordinal)
    values (v_org, v_tender, 'Alcohol prep pad, 70% isopropyl, sterile',
            'Individually wrapped.', 100000, 'piece', 4)
    returning id into i4;

  insert into tender_item_assignees (tender_item_id, user_id, org_id) values
    (i1, v_admin, v_org), (i2, v_admin, v_org), (i3, v_admin, v_org);

  -- Quotes on item 1
  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, alternative_product_name, detail_notes, quoted_at)
  values
    (v_org, i1, s_nanhai, v_admin, 34.50, 'CNY', 'box', 4.9138, 4.9138 * 1.02,
     date '2026-09-15', 28, 'exact', null, 'FOB Shenzhen. MOQ 1,000 boxes.', date '2026-09-14'),
    (v_org, i1, s_siamlotus, v_admin, 182.00, 'THB', 'box', 1, 1,
     date '2026-09-15', 10, 'exact', null, 'Ex-warehouse Bangkok, delivery included.', date '2026-09-14'),
    (v_org, i1, s_blueorchid, v_admin, 171.50, 'THB', 'box', 1, 1,
     date '2026-09-15', 21, 'alternative', 'Nitrile examination gloves, powder-free, size M, violet',
     'Violet instead of blue; same specification otherwise.', date '2026-09-15');

  -- Quotes on item 2, one of them chosen
  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, quoted_at)
  values (v_org, i2, s_pakdee, v_admin, 96.00, 'THB', 'box', 1, 1,
     date '2026-09-15', 14, 'exact', date '2026-09-12')
  returning id into q;

  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, quoted_at)
  values (v_org, i2, s_khlongtan, v_admin, 108.50, 'THB', 'box', 1, 1,
     date '2026-09-15', 7, 'exact', date '2026-09-12');

  update tender_items
     set selected_quote_id = q,
         landed_cost_per_unit = 101.20,
         landed_cost_confirmed_at = now(),
         selling_price_per_unit = 128.00
   where id = i2;

  -- Quotes on item 3, one chosen
  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, quoted_at)
  values (v_org, i3, s_nanhai, v_admin, 0.86, 'CNY', 'piece', 4.9138, 4.9138 * 1.02,
     date '2026-09-15', 35, 'exact', date '2026-09-11')
  returning id into q;

  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, quoted_at)
  values (v_org, i3, s_siamlotus, v_admin, 4.95, 'THB', 'piece', 1, 1,
     date '2026-09-15', 12, 'exact', date '2026-09-11');

  update tender_items
     set selected_quote_id = q,
         landed_cost_per_unit = 4.62,
         landed_cost_confirmed_at = now(),
         selling_price_per_unit = 5.90
   where id = i3;

  -- Item 4: one quote in, still undecided.
  insert into quotes (org_id, tender_item_id, supplier_id, created_by_user_id, unit_price,
    currency, quoted_unit, fx_rate_mid, fx_rate_applied, fx_rate_as_of, lead_time_days,
    match_type, quoted_at)
  values (v_org, i4, s_pakdee, v_admin, 0.62, 'THB', 'piece', 1, 1,
     date '2026-09-15', 9, 'exact', date '2026-09-15');
end $$;

commit;
