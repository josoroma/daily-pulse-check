-- =============================================================================
-- DEMO SEED: pablo+demo@josoroma.com / Demosthenes.579
-- 15 days of rolling data (CURRENT_DATE - 14 → CURRENT_DATE)
-- Run via: supabase db reset (auto-detected from config.toml)
-- =============================================================================

-- Fixed UUIDs for idempotency (all valid hex)
-- User:      d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0
-- Portfolio:  a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1
-- Positions:  b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1  (VOO)
--             b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2  (QQQ)
--             b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3  (BTC)

-- ============================================================
-- 1. AUTH USER
-- ============================================================
-- Password 'Demosthenes.579' hashed with bcrypt (cost 10)
-- The handle_new_user() trigger auto-creates a profile row
insert into auth.users (
  instance_id, id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone, phone_change, phone_change_token,
  reauthentication_token,
  is_super_admin, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0',
  'authenticated', 'authenticated',
  'pablo+demo@josoroma.com',
  '$2a$10$JGQZUjvE526t5jR/BAq.z.HghleRvZFS/IMDA8QRzTbXE.CTGV4La',
  (CURRENT_DATE - 14) + TIME '06:00:00',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Pablo Demo"}',
  (CURRENT_DATE - 14) + TIME '06:00:00',
  (CURRENT_DATE - 14) + TIME '06:00:00',
  '', '',
  '', '', '',
  '', '', '',
  '',
  false, false, false
);

-- Auth identity (required for email login)
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id,
  last_sign_in_at, created_at, updated_at
) values (
  'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0',
  'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0',
  jsonb_build_object('sub', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'email', 'pablo+demo@josoroma.com'),
  'email',
  'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0',
  (CURRENT_DATE - 14) + TIME '06:00:00',
  (CURRENT_DATE - 14) + TIME '06:00:00',
  (CURRENT_DATE - 14) + TIME '06:00:00'
);

-- ============================================================
-- 2. UPDATE PROFILE (trigger created it, we enrich it)
-- ============================================================
update public.profiles set
  display_name = 'Pablo Demo',
  base_currency = 'USD',
  country = 'CR',
  risk_tolerance = 'Medium-High',
  ai_provider = 'ollama',
  ai_model = 'qwen3.5:9b',
  notification_email_enabled = true,
  notification_telegram_enabled = false
where id = 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0';

-- ============================================================
-- 3. PORTFOLIO
-- ============================================================
insert into public.portfolios (id, user_id, name, description, target_allocations) values (
  'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1',
  'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0',
  'Main Portfolio',
  'VOO + QQQ + BTC long-term growth strategy',
  '{"VOO": 40, "QQQ": 30, "BTC": 30}'
);

-- ============================================================
-- 4. POSITIONS
-- ============================================================
insert into public.positions (id, user_id, portfolio_id, asset_type, symbol, quantity, average_buy_price, notes) values
  ('b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'ETF',    'VOO', 15.00,   480.25, 'Core S&P 500 index — long term hold'),
  ('b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'ETF',    'QQQ', 10.00,   495.50, 'Nasdaq 100 tech-heavy exposure'),
  ('b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'Crypto', 'BTC',  0.15, 68500.00, 'Long-term HODL — DCA accumulation');

-- ============================================================
-- 5. TRANSACTIONS (13 entries across 15 days)
-- ============================================================
insert into public.transactions (id, user_id, position_id, type, quantity, price, fee, executed_at, notes) values
  -- Day 1 (CURRENT_DATE - 14): Initial purchases
  ('c1000001-c100-4c10-ac10-c10000010001', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1', 'Buy', 10.00,  478.50, 0.00, (CURRENT_DATE - 14) + TIME '14:30:00', 'Initial VOO position'),
  ('c1000002-c100-4c10-ac10-c10000020002', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2', 'Buy',  7.00,  492.30, 0.00, (CURRENT_DATE - 14) + TIME '14:35:00', 'Initial QQQ position'),
  ('c1000003-c100-4c10-ac10-c10000030003', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3', 'Buy',  0.10, 67200.00, 1.50, (CURRENT_DATE - 14) + TIME '15:00:00', 'Initial BTC purchase'),

  -- Week 1 DCA (day -10 Mon, day -8 Wed, day -6 Fri)
  ('c1000004-c100-4c10-ac10-c10000040004', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1', 'DCA',  0.42,  483.10, 0.00, (CURRENT_DATE - 10) + TIME '14:30:00', 'Weekly DCA — $200'),
  ('c1000005-c100-4c10-ac10-c10000050005', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2', 'DCA',  0.30,  498.75, 0.00, (CURRENT_DATE - 8) + TIME '14:30:00', 'Weekly DCA — $150'),
  ('c1000006-c100-4c10-ac10-c10000060006', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3', 'DCA',  0.0015, 69100.00, 0.75, (CURRENT_DATE - 6) + TIME '15:00:00', 'Weekly DCA — $100'),

  -- BTC partial sell (day -4 — take small profit)
  ('c1000007-c100-4c10-ac10-c10000070007', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3', 'Sell', 0.005, 71800.00, 1.00, (CURRENT_DATE - 4) + TIME '16:00:00', 'Small take-profit — testing sell flow'),

  -- Week 2 DCA (day -3 Mon, day -1 Wed)
  ('c1000008-c100-4c10-ac10-c10000080008', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1', 'DCA',  0.41,  489.20, 0.00, (CURRENT_DATE - 3) + TIME '14:30:00', 'Weekly DCA — $200'),
  ('c1000009-c100-4c10-ac10-c10000090009', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2', 'DCA',  0.29,  505.40, 0.00, (CURRENT_DATE - 1) + TIME '14:30:00', 'Weekly DCA — $150'),

  -- Additional buys mid-range
  ('c1000010-c100-4c10-ac10-c10000100010', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b1b1b1b1-b100-4b10-ab10-b1b1b1b1b1b1', 'Buy',  4.17,  481.60, 0.00, (CURRENT_DATE - 12) + TIME '14:30:00', 'Adding to VOO on dip'),
  ('c1000011-c100-4c10-ac10-c10000110011', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b2b2b2b2-b200-4b20-ab20-b2b2b2b2b2b2', 'Buy',  2.71,  499.80, 0.00, (CURRENT_DATE - 12) + TIME '14:35:00', 'Adding QQQ'),
  ('c1000012-c100-4c10-ac10-c10000120012', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'b3b3b3b3-b300-4b30-ab30-b3b3b3b3b3b3', 'DCA', 0.0435, 68750.00, 1.00, CURRENT_DATE + TIME '15:00:00', 'Weekly DCA — $100 (Fri)');

-- ============================================================
-- 6. DCA SCHEDULES (3 active)
-- ============================================================
insert into public.dca_schedules (id, user_id, portfolio_id, symbol, asset_type, amount, frequency, day_of_week, is_active, next_execution_at) values
  ('d1d1d1d1-d1d1-4d1d-ad1d-d1d1d1d10001', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'VOO', 'ETF',    200.00, 'Weekly', 1, true, (CURRENT_DATE + 4) + TIME '14:30:00'),
  ('d2d2d2d2-d2d2-4d2d-ad2d-d2d2d2d20002', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'QQQ', 'ETF',    150.00, 'Weekly', 3, true, (CURRENT_DATE + 6) + TIME '14:30:00'),
  ('d3d3d3d3-d3d3-4d3d-ad3d-d3d3d3d30003', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', 'BTC', 'Crypto', 100.00, 'Weekly', 5, true, (CURRENT_DATE + 8) + TIME '15:00:00');

-- ============================================================
-- 7. ALERTS (5 active + 1 triggered)
-- ============================================================
insert into public.alerts (id, user_id, symbol, asset_type, condition, threshold, is_active, status, parameters, notification_channels, last_triggered_at) values
  -- Active alerts
  ('e1e1e1e1-e1e1-4e1e-ae1e-e1e1e1e10001', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'BTC', 'Crypto', 'above',         95000, true,  'active',    '{}',                                    '{in_app,email}', null),
  ('e2e2e2e2-e2e2-4e2e-ae2e-e2e2e2e20002', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'BTC', 'Crypto', 'below',         60000, true,  'active',    '{}',                                    '{in_app}',       null),
  ('e3e3e3e3-e3e3-4e3e-ae3e-e3e3e3e30003', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'VOO', 'ETF',    'above',           520, true,  'active',    '{}',                                    '{in_app,email}', null),
  ('e4e4e4e4-e4e4-4e4e-ae4e-e4e4e4e40004', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'QQQ', 'ETF',    'rsi_above',        70, true,  'active',    '{"rsi_period": 14}',                    '{in_app}',       null),
  ('e5e5e5e5-e5e5-4e5e-ae5e-e5e5e5e50005', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'BTC', 'Crypto', 'mvrv_above',      3.5, true,  'active',    '{}',                                    '{in_app,email}', null),
  -- Triggered alert (4 days ago)
  ('e6e6e6e6-e6e6-4e6e-ae6e-e6e6e6e60006', 'd0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'VOO', 'ETF',    'below',           450, false, 'triggered', '{}',                                    '{in_app}',       (CURRENT_DATE - 4) + TIME '14:00:00');

-- ============================================================
-- 8. PORTFOLIO SNAPSHOTS (15 days)
-- Realistic price evolution with daily variance
-- VOO ~$478→$502, QQQ ~$492→$512, BTC ~$67K→$84K
-- ============================================================
insert into public.portfolio_snapshots (user_id, portfolio_id, snapshot_date, total_value, positions_data) values
  -- Day -14: Opening day — 10 VOO @ ~478, 7 QQQ @ ~492, 0.10 BTC @ ~67,200
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 14, 15977.00, '[{"symbol":"VOO","asset_type":"ETF","quantity":10,"price":478.50,"value":4785.00},{"symbol":"QQQ","asset_type":"ETF","quantity":7,"price":492.30,"value":3446.10},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":67460.00,"value":6746.00}]'),

  -- Day -13: Slight uptick
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 13, 16148.50, '[{"symbol":"VOO","asset_type":"ETF","quantity":10,"price":481.20,"value":4812.00},{"symbol":"QQQ","asset_type":"ETF","quantity":7,"price":494.50,"value":3461.50},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":68750.00,"value":6875.00}]'),

  -- Day -12: Added more positions (now 14.17 VOO, 9.71 QQQ, 0.10 BTC)
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 12, 18023.75, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.17,"price":483.80,"value":6855.45},{"symbol":"QQQ","asset_type":"ETF","quantity":9.71,"price":497.10,"value":4826.84},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":69414.60,"value":6941.46}]'),

  -- Day -11: Weekend, slight crypto rally
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 11, 18215.30, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.17,"price":484.50,"value":6865.37},{"symbol":"QQQ","asset_type":"ETF","quantity":9.71,"price":498.20,"value":4837.52},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":71124.10,"value":7112.41}]'),

  -- Day -10: DCA VOO (now 14.59 VOO), small dip
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 10, 18089.60, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":481.90,"value":7031.02},{"symbol":"QQQ","asset_type":"ETF","quantity":9.71,"price":495.30,"value":4809.36},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":69492.20,"value":6949.22}]'),

  -- Day -9: Bearish day — tech selloff
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 9, 17684.20, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":477.40,"value":6965.07},{"symbol":"QQQ","asset_type":"ETF","quantity":9.71,"price":488.60,"value":4744.31},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":66748.20,"value":6674.82}]'),

  -- Day -8: Recovery begins, DCA QQQ (now 10.01 QQQ)
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 8, 17892.40, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":479.80,"value":6999.88},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":491.70,"value":4921.92},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":67706.00,"value":6770.60}]'),

  -- Day -7: Continued recovery
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 7, 18124.70, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":482.60,"value":7040.73},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":496.40,"value":4968.96},{"symbol":"BTC","asset_type":"Crypto","quantity":0.10,"price":69150.10,"value":6915.01}]'),

  -- Day -6: DCA BTC (now 0.1015 BTC), BTC rallies
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 6, 18543.80, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":485.30,"value":7080.53},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":499.80,"value":5003.00},{"symbol":"BTC","asset_type":"Crypto","quantity":0.1015,"price":73503.10,"value":7460.56}]'),

  -- Day -5: Strong day, new portfolio high
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 5, 18812.50, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":488.10,"value":7121.45},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":503.20,"value":5037.03},{"symbol":"BTC","asset_type":"Crypto","quantity":0.1015,"price":75408.40,"value":7654.02}]'),

  -- Day -4: Sold 0.005 BTC (now 0.0965 BTC), slight pullback
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 4, 18341.20, '[{"symbol":"VOO","asset_type":"ETF","quantity":14.59,"price":486.70,"value":7101.05},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":501.60,"value":5021.02},{"symbol":"BTC","asset_type":"Crypto","quantity":0.0965,"price":74288.10,"value":7168.81}]'),

  -- Day -3: DCA VOO (now 15.00 VOO), stabilizing
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 3, 18625.40, '[{"symbol":"VOO","asset_type":"ETF","quantity":15.00,"price":490.80,"value":7362.00},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":504.50,"value":5050.05},{"symbol":"BTC","asset_type":"Crypto","quantity":0.0965,"price":76308.80,"value":7363.80}]'),

  -- Day -2: Small gains
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 2, 18876.30, '[{"symbol":"VOO","asset_type":"ETF","quantity":15.00,"price":493.20,"value":7398.00},{"symbol":"QQQ","asset_type":"ETF","quantity":10.01,"price":507.80,"value":5083.08},{"symbol":"BTC","asset_type":"Crypto","quantity":0.0965,"price":78192.40,"value":7545.57}]'),

  -- Day -1: DCA QQQ (now 10.30 QQQ), mild pullback
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE - 1, 18744.80, '[{"symbol":"VOO","asset_type":"ETF","quantity":15.00,"price":491.40,"value":7371.00},{"symbol":"QQQ","asset_type":"ETF","quantity":10.30,"price":504.90,"value":5200.47},{"symbol":"BTC","asset_type":"Crypto","quantity":0.0965,"price":76510.60,"value":7383.27}]'),

  -- Day 0 (today): DCA BTC (now 0.14 BTC), recovery
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'a1a1a1a1-a1a1-4a1a-ba1a-a1a1a1a1a1a1', CURRENT_DATE, 19218.60, '[{"symbol":"VOO","asset_type":"ETF","quantity":15.00,"price":494.60,"value":7419.00},{"symbol":"QQQ","asset_type":"ETF","quantity":10.30,"price":508.40,"value":5236.52},{"symbol":"BTC","asset_type":"Crypto","quantity":0.14,"price":79522.00,"value":11133.08}]');

-- ============================================================
-- 9. AI SUMMARIES (15 days of market commentary)
-- ============================================================
insert into public.ai_summaries (user_id, summary_date, content, model_used) values

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 14,
'## Market Summary — Day 1

**Markets opened mixed** as investors digest the latest Fed commentary. The S&P 500 edged up 0.3% while the Nasdaq gained 0.5% on renewed AI optimism.

### Key Metrics
- **VOO**: $478.50 (+0.3%) — Steady, holding above the 50-day moving average
- **QQQ**: $492.30 (+0.5%) — Tech leading on strong NVDA earnings guidance
- **BTC**: $67,460 (-1.2%) — Consolidating after last week''s rally to $69K

### Macro Landscape
- **Fed Funds Rate**: 4.25% — Markets pricing 2 cuts by year-end
- **10Y Treasury**: 4.18% — Slight uptick on inflation concerns
- **DXY**: 103.8 — Dollar strength pressuring crypto
- **Fear & Greed**: 52 (Neutral)

### Portfolio Impact
Your portfolio is positioned well for a rate-cutting cycle. VOO and QQQ benefit from lower rates, while BTC historically rallies 6-12 months post-halving (April 2024). Consider maintaining your DCA schedule through this consolidation phase.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 13,
'## Market Summary — Day 2

**Strong session** — all three major indices closed higher. Tech sector led gains with the Nasdaq up 0.8%.

### Key Metrics
- **VOO**: $481.20 (+0.6%) — Breaking out of a 3-day consolidation range
- **QQQ**: $494.50 (+0.4%) — Chip stocks recovering after mid-week selloff
- **BTC**: $68,750 (+1.9%) — Reclaiming $68K, short squeeze fueling the move

### Macro Landscape
- **Inflation (CPI)**: 2.8% YoY — Trending toward the 2% target
- **Fear & Greed**: 55 (Neutral)

### Portfolio Impact
Solid week overall. Your BTC position is approaching your cost basis — the DCA strategy is working as designed. Monitor the $70K resistance level for BTC; a breakout could signal the next leg up.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 12,
'## Market Summary — Day 3

**Weekend update** — Crypto markets remain active. BTC pushed above $69K overnight on ETF inflow data.

### Key Metrics
- **VOO**: $483.80 (markets closed — last close)
- **QQQ**: $497.10 (markets closed — last close)
- **BTC**: $69,415 (+1.0%) — ETF net inflows hit $420M

### Notable Developments
- BlackRock IBIT saw largest single-day inflow in 3 months
- Fed Governor Waller hinted at "patience" on rate cuts — slightly hawkish
- Costa Rica colón strengthened to ₡508/USD

### Portfolio Impact
Good day to add to positions during weekend calm. Your portfolio crossed $18K — the added VOO and QQQ positions are building a strong cost-basis foundation.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 11,
'## Market Summary — Day 4

**Bitcoin surges** past $71K as weekend momentum builds. Altcoin market follows with broad-based gains.

### Key Metrics
- **VOO**: $484.50 (markets closed)
- **QQQ**: $498.20 (markets closed)
- **BTC**: $71,124 (+2.5%) — Testing the $72K resistance zone

### On-Chain Data
- MVRV Z-Score: 1.8 — Still in fair value territory (under 3.0)
- Exchange reserves declining — supply squeeze forming
- Mining difficulty at all-time high — network health strong

### Portfolio Impact
Your BTC allocation is now the largest contributor to daily P&L swings. The MVRV Z-Score at 1.8 suggests we''re not in overheated territory yet. Your $95K alert for BTC has room to run.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 10,
'## Market Summary — Day 5

**Monday pullback** — Profit-taking after a strong weekend for crypto. Equities opened slightly lower on geopolitical concerns.

### Key Metrics
- **VOO**: $481.90 (-0.5%) — Mild selling pressure, support at $480
- **QQQ**: $495.30 (-0.6%) — Semiconductor weakness dragging the index
- **BTC**: $69,492 (-2.3%) — Gave back weekend gains, holding $69K support

### Macro Landscape
- **Fed Funds Rate**: 4.25% (unchanged)
- **DXY**: 104.1 — Dollar firming, headwind for risk assets
- **Fear & Greed**: 48 (Neutral)

### Portfolio Impact
Your DCA executed today — $200 into VOO at $483.10. Good entry near the weekly low. The pullback is healthy; no reason to change strategy.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 9,
'## Market Summary — Day 6

**Tech selloff deepens** — Nasdaq dropped 1.4% on disappointing cloud earnings and renewed tariff concerns.

### Key Metrics
- **VOO**: $477.40 (-0.9%) — Testing the 20-day moving average
- **QQQ**: $488.60 (-1.4%) — Worst day in 2 weeks, MSFT and AMZN leading the decline
- **BTC**: $66,748 (-3.9%) — Risk-off sentiment spilling into crypto

### Macro Landscape
- **10Y Treasury**: 4.25% — Spiking on hot PPI data
- **VIX**: 19.2 — Elevated but not panic territory
- **Fear & Greed**: 38 (Fear)

### Portfolio Impact
Portfolio dipped to ~$17,684 — largest single-day decline this period. This is normal volatility; your diversified allocation cushions the blow. The Fear & Greed drop to 38 is actually a historically good buying signal.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 8,
'## Market Summary — Day 7

**Bounce-back Wednesday** — Markets rebounded from yesterday''s selloff. Bargain hunting in tech names.

### Key Metrics
- **VOO**: $479.80 (+0.5%) — Recovering from the 20-day MA test
- **QQQ**: $491.70 (+0.6%) — Bottom-fishing in mega-cap tech
- **BTC**: $67,706 (+1.4%) — Recovering but still below $68K

### Macro Landscape
- **Fed Minutes**: Showed committee divided on pace of cuts — 2 members favor holding
- **Fear & Greed**: 42 (Fear)

### Portfolio Impact
Your DCA into QQQ today at $498.75 caught prices near the weekly low. The recovery pattern looks constructive — markets tend to V-bounce from these shallow pullbacks in bull trends.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 7,
'## Market Summary — Day 8

**Steady gains** — Markets continued their recovery. Tech sector outperformed with AI infrastructure spending reports.

### Key Metrics
- **VOO**: $482.60 (+0.6%) — Back above the 20-day MA
- **QQQ**: $496.40 (+1.0%) — AI capex estimates lifted semis
- **BTC**: $69,150 (+2.1%) — Approaching the $70K psychological level again

### Macro Landscape
- **Jobless Claims**: 218K (lower than expected — labor market remains tight)
- **Fear & Greed**: 47 (Neutral)

### Portfolio Impact
Portfolio recovering nicely — nearly back to pre-selloff levels. The 3-day dip-and-recovery pattern is textbook bull market behavior. Your DCA schedule is performing exactly as designed — buying more during dips.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 6,
'## Market Summary — Day 9

**Crypto leads Friday rally** — Bitcoin broke through $73K as institutional demand surges. Equities closed the week higher.

### Key Metrics
- **VOO**: $485.30 (+0.6%) — Solid weekly close, up 1.5% for the week
- **QQQ**: $499.80 (+0.7%) — Reclaiming $500 level
- **BTC**: $73,503 (+6.3%) — Breakout! Highest weekly close in months

### On-Chain Data
- ETF inflows: $890M this week (2nd strongest week ever)
- MVRV Z-Score: 2.1 — Warming up but still healthy
- Hash rate: New ATH — miners bullish

### Portfolio Impact
Your BTC DCA today added 0.0015 BTC at $69,100 — you caught it before the late-day surge. Portfolio hit a new high at $18,543. The VOO $450 alert you had? That triggered during the Day 6 dip. Consider resetting it.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 5,
'## Market Summary — Day 10

**Weekend euphoria** — Bitcoin continues its rally past $75K. Crypto Twitter is buzzing but on-chain metrics still support the move.

### Key Metrics
- **VOO**: $488.10 (markets closed)
- **QQQ**: $503.20 (markets closed)
- **BTC**: $75,408 (+2.6%) — Eyeing the $80K psychological level

### On-Chain Data
- Long-term holder supply ratio: 72% — No distribution yet
- Funding rates: Slightly positive but not overheated
- Exchange outflows accelerating — accumulation trend

### Portfolio Impact
Your portfolio hit a new all-time high at $18,812! BTC is now your best-performing asset since inception. The MVRV Z-Score at 2.3 still has room before the 3.5 danger zone where your alert is set.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 4,
'## Market Summary — Day 11

**Profit-taking day** — After a massive week, some traders are taking chips off the table. BTC pulled back 1.5%.

### Key Metrics
- **VOO**: $486.70 (markets closed)
- **QQQ**: $501.60 (markets closed)
- **BTC**: $74,288 (-1.5%) — Healthy retracement after the $75K test

### Market Sentiment
- **Fear & Greed**: 65 (Greed) — Rising fast, watch for overextension
- Weekend volume: Lower than yesterday — not a panic sell

### Portfolio Impact
You took a small profit — sold 0.005 BTC at $71,800. Smart risk management. Portfolio at $18,341 after the rebalance. The slight pullback is normal after a 10%+ weekly BTC rally.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 3,
'## Market Summary — Day 12

**Q1 closing session** — Markets ended the quarter on a positive note. S&P 500 posted a 4.2% quarterly gain.

### Key Metrics
- **VOO**: $490.80 (+0.8%) — Strong quarterly close
- **QQQ**: $504.50 (+0.6%) — Tech finished Q1 up 5.8%
- **BTC**: $76,309 (+2.7%) — Reclaiming momentum heading into Q2

### Q1 2026 Scorecard
- S&P 500: +4.2%
- Nasdaq 100: +5.8%
- Bitcoin: +18.4%
- Your portfolio: +12.3%

### Portfolio Impact
Your VOO DCA executed today — $200 at $489.20. Excellent quarter! Your portfolio outperformed the S&P 500 by 8 percentage points, largely thanks to the BTC allocation. Q2 setup looks favorable with rate cuts on the horizon.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 2,
'## Market Summary — Day 13

**Q2 starts strong** — Markets rally on ISM Manufacturing data beating expectations. Risk appetite returns.

### Key Metrics
- **VOO**: $493.20 (+0.5%) — Testing $495 resistance
- **QQQ**: $507.80 (+0.7%) — Semis leading the charge
- **BTC**: $78,192 (+2.5%) — Marching into uncharted territory

### Macro Landscape
- **ISM Manufacturing**: 52.8 (expansion!) — First time above 50 in 4 months
- **10Y Treasury**: 4.12% — Dropping, which supports equities
- **Fear & Greed**: 68 (Greed)

### Portfolio Impact
Portfolio pushing toward $19K — your allocation strategy is delivering. The 40/30/30 split across VOO/QQQ/BTC captured gains from both the equity rally and BTC breakout. Keep the DCA running; momentum is your friend here.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE - 1,
'## Market Summary — Day 14

**Mild pullback** — Markets gave back some gains ahead of the jobs report. Normal pre-NFP positioning.

### Key Metrics
- **VOO**: $491.40 (-0.4%) — Consolidating below $495
- **QQQ**: $504.90 (-0.6%) — Profit-taking in tech
- **BTC**: $76,511 (-2.2%) — Cooling off after the $78K push

### Macro Landscape
- **ADP Employment**: 185K (in line) — No surprises
- **Fear & Greed**: 58 (Greed) — Pulling back from highs
- **JOLTS**: 7.8M openings — Labor market softening gradually

### Portfolio Impact
Your QQQ DCA executed today at $505.40. Portfolio at $18,744 — a minor dip but still well above where you started. The pre-jobs-report pullback is a pattern we see every month; usually resolved positively.', 'ollama/qwen3.5:9b'),

('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', CURRENT_DATE,
'## Market Summary — Today

**Markets treading water** ahead of tomorrow''s Non-Farm Payrolls report. BTC showing strength while equities consolidate.

### Key Metrics
- **VOO**: $494.60 (+0.7%) — Bouncing back, approaching $495 again
- **QQQ**: $508.40 (+0.7%) — Tech buyers stepping in
- **BTC**: $79,522 (+3.9%) — Breaking above $79K! $80K within reach

### On-Chain Data
- MVRV Z-Score: 2.5 — Rising but well below your 3.5 alert trigger
- Bitcoin dominance: 58.2% — Capital rotating into BTC ahead of alts
- Network fees spiking — high demand for block space

### Portfolio Impact
BTC DCA executed today — 0.0435 BTC at $68,750. Position now at 0.14 BTC. Portfolio recovered to $19,218 — new high! Your BTC allocation is driving outperformance. All 5 active alerts remain untriggered; the market is in a sweet spot between fear and excessive greed.', 'ollama/qwen3.5:9b');

-- ============================================================
-- 10. NOTIFICATIONS (8 entries — mix of types and read states)
-- ============================================================
insert into public.notifications (user_id, type, title, body, read, related_id, created_at) values
  -- System welcome
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'system', 'Welcome to Finance Dashboard!', 'Your portfolio is set up and ready. Start by reviewing your positions and setting alerts.', true, null, (CURRENT_DATE - 14) + TIME '06:05:00'),

  -- DCA reminders
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'dca_reminder', 'DCA Reminder: VOO', 'Time to invest $200.00 in VOO', true, 'd1d1d1d1-d1d1-4d1d-ad1d-d1d1d1d10001', (CURRENT_DATE - 10) + TIME '20:00:00'),
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'dca_reminder', 'DCA Reminder: QQQ', 'Time to invest $150.00 in QQQ', true, 'd2d2d2d2-d2d2-4d2d-ad2d-d2d2d2d20002', (CURRENT_DATE - 8) + TIME '20:00:00'),
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'dca_reminder', 'DCA Reminder: BTC', 'Time to invest $100.00 in BTC', true, 'd3d3d3d3-d3d3-4d3d-ad3d-d3d3d3d30003', (CURRENT_DATE - 6) + TIME '20:00:00'),

  -- Triggered alert notification
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'price_alert', 'Alert: VOO ↓', 'VOO dropped below $450.00 — current price: $448.20', true, 'e6e6e6e6-e6e6-4e6e-ae6e-e6e6e6e60006', (CURRENT_DATE - 4) + TIME '14:00:00'),

  -- Recent unread notifications
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'dca_reminder', 'DCA Reminder: VOO', 'Time to invest $200.00 in VOO', false, 'd1d1d1d1-d1d1-4d1d-ad1d-d1d1d1d10001', (CURRENT_DATE - 3) + TIME '20:00:00'),
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'dca_reminder', 'DCA Reminder: QQQ', 'Time to invest $150.00 in QQQ', false, 'd2d2d2d2-d2d2-4d2d-ad2d-d2d2d2d20002', (CURRENT_DATE - 1) + TIME '20:00:00'),
  ('d0d0d0d0-de00-4de0-ade0-d0d0d0d0d0d0', 'system', 'Weekly Portfolio Digest', 'Your portfolio gained +5.2% this week. BTC was the top performer at +8.4%. All DCA schedules executed on time.', false, null, CURRENT_DATE + TIME '08:00:00');

-- ============================================================
-- 11. MARKET CACHE (warm cache for instant dashboard load)
-- ============================================================
insert into public.market_cache (key, data, fetched_at, ttl_seconds) values
  ('stock:price:VOO', '{"symbol":"VOO","price":494.60,"change":3.20,"changePercent":0.65,"currency":"USD","timestamp":"2026-04-03T20:00:00Z"}', now(), 300),
  ('stock:price:QQQ', '{"symbol":"QQQ","price":508.40,"change":3.50,"changePercent":0.69,"currency":"USD","timestamp":"2026-04-03T20:00:00Z"}', now(), 300),
  ('crypto:bitcoin:price', '{"priceUsd":79522.00,"percentChange24h":3.94,"marketCap":1575000000000,"volume24h":48200000000,"lastUpdated":"2026-04-03T20:00:00Z"}', now(), 300),
  ('sentiment:crypto:feargreed', '{"value":58,"classification":"Greed","timestamp":"2026-04-03","previousClose":65}', now(), 3600)
on conflict (key) do update set
  data = excluded.data,
  fetched_at = excluded.fetched_at,
  ttl_seconds = excluded.ttl_seconds;

-- ============================================================
-- Done! Log in with:
--   Email:    pablo+demo@josoroma.com
--   Password: Demosthenes.579
-- ============================================================
