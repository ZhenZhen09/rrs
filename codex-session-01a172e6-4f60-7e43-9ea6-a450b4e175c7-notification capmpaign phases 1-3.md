# Codex conversation

## User

what is the flow now of the login to attendance, start shift up to end shift of the system (mobile-app rider and the web admin)?

## Assistant

I’ll trace the current implementation through the project’s knowledge graph first, then verify the key mobile rider and web-admin code paths so the flow reflects what the system actually does.

## Activity

    $ graphify query "What is the end-to-end flow from login to attendance, start shift, and end shift for the mobile rider app and web admin? Include authentication, API routes, database writes, status transitions, approvals, and real-time updates."
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Traversal: BFS depth=2 | Start: ['Task 1: Make attendance status transitions respect open sessions', 'codex-session-01a160ee-b6c5-7742-aaeb-9d2df6341581-10-22-26-continue end-shift time and set admin.md', 'web-mobile-workflow.spec.ts', 'ADMIN', 'api', 'App()', 'BatchApprovalSequence()', 'AttendanceDashboard.tsx', 'Authentication connection', 'Database rollout', '.end()', 'Flow Verification', 'include', 'Login()', 'Mobile Admin NativeWind Migration Design', 'RealTimeContext.tsx', 'rider', 'routes.tsx', 'ShiftControlCard.tsx', 'start', 'Status', '.time()', '._performTransitionSideEffects()', 'updateStatusSchema', 'web', 'writeSecure()'] | 669 nodes found
    
    NODE s() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=6]
    NODE l() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L2 community=5]
    NODE o() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=65]
    NODE h() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L2 community=32]
    NODE c() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=23]
    NODE cn() [src=.superpowers/sdd/2026-10-04-web-typecheck-repair/baseline/src/app/components/ui/utils.ts loc=L4 community=8]
    NODE cn() [src=src/app/components/ui/utils.ts loc=L4 community=9]
    NODE u() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=42]
    NODE r() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=0]
    NODE e() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=15]
    NODE Codex conversation [src=codex-session-01a0e708-ea05-7503-a964-95c45ee40ead.md loc=L1 community=3]
    NODE Codex conversation [src=codex-session-01a160ee-b6c5-7742-aaeb-9d2df6341581-10-22-26-continue end-shift time and set admin.md loc=L1 community=14]
    NODE v() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=28]
    NODE PersonnelV2Page.tsx [src=src/app/personnel-v2/PersonnelV2Page.tsx loc=L1 community=34]
    NODE utils.ts [src=src/app/components/ui/utils.ts loc=L1 community=43]
    NODE PersonnelDashboard.tsx [src=src/app/pages/PersonnelDashboard.tsx loc=L1 community=29]
    NODE LocationContext.tsx [src=mobile-app/context/LocationContext.tsx loc=L1 community=57]
    NODE AnalyticsHub.tsx [src=src/app/pages/Admin/AnalyticsHub.tsx loc=L1 community=33]
    NODE DispatchConsole.tsx [src=src/app/pages/Admin/DispatchConsole.tsx loc=L1 community=17]
    NODE index.ts [src=src/app/types/index.ts loc=L1 community=22]
    NODE requests.ts [src=server/routes/requests.ts loc=L1 community=81]
    NODE RequestDetailsPanel.tsx [src=src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx loc=L1 community=123]
    NODE AdminLayout.tsx [src=src/app/pages/Admin/AdminLayout.tsx loc=L1 community=17]
    NODE sidebar.tsx [src=src/app/components/ui/sidebar.tsx loc=L1 community=9]
    NODE AdminMessaging.tsx [src=src/app/pages/Admin/AdminMessaging.tsx loc=L1 community=45]
    NODE index.tsx [src=mobile-app/app/(tabs)/index.tsx loc=L1 community=49]
    NODE apiService.ts [src=mobile-app/services/apiService.ts loc=L1 community=141]
    NODE UserManagement.tsx [src=src/app/pages/Admin/UserManagement.tsx loc=L1 community=17]
    NODE RiderDashboard.tsx [src=src/app/pages/RiderDashboard.tsx loc=L1 community=29]
    NODE Dashboard.tsx [src=src/app/pages/Dashboard.tsx loc=L1 community=17]
    NODE _layout.tsx [src=mobile-app/app/_layout.tsx loc=L1 community=73]
    NODE button.tsx [src=src/app/components/ui/button.tsx loc=L1 community=17]
    NODE tomorrow.tsx [src=mobile-app/app/(tabs)/tomorrow.tsx loc=L1 community=49]
    NODE CalendarView.tsx [src=src/app/pages/Admin/CalendarView.tsx loc=L1 community=29]
    NODE LiveTrackingMap.tsx [src=src/app/components/LiveTrackingMap.tsx loc=L1 community=82]
    NODE DeliveryRequest [src=src/app/types/index.ts loc=L155 community=22]
    NODE error() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L552 community=222]
    NODE useJobDetails.ts [src=mobile-app/hooks/data/useJobDetails.ts loc=L1 community=141]
    NODE useLocation() [src=mobile-app/context/LocationContext.tsx loc=L1088 community=306]
    NODE Button [src=src/app/components/ui/button.tsx loc=L43 community=17]
    NODE DataContext.tsx [src=src/app/context/DataContext.tsx loc=L1 community=11]
    NODE LiveTrackingDashboard.tsx [src=src/app/pages/LiveTrackingDashboard.tsx loc=L1 community=22]
    NODE EnhancedBatchApproveModal.tsx [src=src/app/components/Admin/EnhancedBatchApproveModal.tsx loc=L1 community=17]
    NODE useData() [src=src/app/context/DataContext.tsx loc=L783 community=11]
    NODE responsive.ts [src=mobile-app/utils/responsive.ts loc=L1 community=49]
    NODE api.ts [src=mobile-app/utils/api.ts loc=L1 community=106]
    NODE useAuth() [src=src/app/context/AuthContext.tsx loc=L186 community=17]
    NODE overdue.tsx [src=mobile-app/app/(tabs)/overdue.tsx loc=L1 community=49]
    NODE getDb() [src=mobile-app/services/localDb.ts loc=L10 community=141]
    NODE useMessaging.ts [src=mobile-app/hooks/useMessaging.ts loc=L1 community=25]
    NODE taskFilters.ts [src=mobile-app/utils/taskFilters.ts loc=L1 community=24]
    NODE card.tsx [src=src/app/components/ui/card.tsx loc=L1 community=43]
    NODE history.tsx [src=mobile-app/app/(tabs)/history.tsx loc=L1 community=49]
    NODE .addListener() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L1887 community=28]
    NODE verticalScale() [src=mobile-app/utils/responsive.ts loc=L19 community=49]
    NODE AuthContext.tsx [src=src/app/context/AuthContext.tsx loc=L1 community=11]
    NODE ShiftControlCard.tsx [src=mobile-app/components/ShiftControlCard.tsx loc=L1 community=24]
    NODE scale() [src=mobile-app/utils/responsive.ts loc=L13 community=49]
    NODE OverdueTaskCard.tsx [src=mobile-app/components/jobs/OverdueTaskCard.tsx loc=L1 community=49]
    NODE syncQueue.ts [src=mobile-app/services/syncQueue.ts loc=L1 community=141]
    NODE badge.tsx [src=src/app/components/ui/badge.tsx loc=L1 community=17]
    NODE dialog.tsx [src=src/app/components/ui/dialog.tsx loc=L1 community=17]
    NODE CategoryPicker.tsx [src=src/app/components/ui/CategoryPicker.tsx loc=L1 community=83]
    ... (truncated — 606 more nodes cut by ~2000-token budget. Narrow with context_filter=['call'] or use get_node for a specific symbol)
    ✓ • 2.55s

## Activity

    $ Get-Content -Raw graphify-out/wiki/index.md; graphify explain "ShiftControlCard"; graphify explain "AttendanceDashboard"; graphify explain "Authentication connection"
    Get-Content : Cannot find path
    'C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\graphify-out\wiki\index.md' because it does not exist.
    At line:2 char:1
    + Get-Content -Raw graphify-out/wiki/index.md; graphify explain "ShiftC ...
    + ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        + CategoryInfo          : ObjectNotFound: (C:\Users\63938\...t\wiki\index.md:String) [Get-Content], ItemNotFoundEx
       ception
        + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
    
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Node: ShiftControlCard()
      ID:        mobile_app_components_shiftcontrolcard_shiftcontrolcard
      Source:    mobile-app/components/ShiftControlCard.tsx L25
      Type:      code
      Community: 24
      Degree:    8
    
    Connections (8):
      --> useLocation() [calls] [EXTRACTED]
      <-- ShiftControlCard.tsx [contains] [EXTRACTED]
      <-- ShiftControlDrawer.tsx [imports] [EXTRACTED]
      --> getRiderTaskTab() [calls] [EXTRACTED]
      --> .reason() [indirect_call] [INFERRED]
      <-- ShiftControlCard.test.tsx [imports] [EXTRACTED]
      --> getPhilippineClock() [calls] [EXTRACTED]
      --> formatShiftStartTime() [calls] [EXTRACTED]
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Node: AttendanceDashboard
      ID:        superpowers_sdd_2026_10_04_web_typecheck_repair_baseline_src_app_pages_admin_adminlayout_attendancedashboard
      Source:    .superpowers/sdd/2026-10-04-web-typecheck-repair/baseline/src/app/pages/Admin/AdminLayout.tsx L22
      Type:      code
      Community: 58
      Degree:    1
    
    Connections (1):
      <-- AdminLayout.tsx [contains] [EXTRACTED]
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Node: Authentication connection
      ID:        codex_session_01a0e708_ea05_7503_a964_95c45ee40ead_authentication_connection
      Source:    codex-session-01a0e708-ea05-7503-a964-95c45ee40ead.md L4712
      Type:      document
      Community: 196
      Degree:    1
    
    Connections (1):
      <-- Assistant [contains] [EXTRACTED]
    ✓ • 4.37s

## Assistant

The graph points to the rider’s `ShiftControlCard` and the admin attendance dashboard, but its broad result also includes generated/baseline artifacts. I’m narrowing this to the live source files and server endpoints, including what happens when sessions are already open or an end-shift request needs admin action.

## Activity

    $ rg -n --glob '!graphify-out/**' --glob '!mobile-admin/.expo/**' --glob '!.superpowers/**' "start.?shift|end.?shift|attendance|clock.?in|clock.?out|login|signIn|approve.*shift|shift.*approve" mobile-app src server shared tests
    tests\admin-self-healing.spec.ts:14:    await page.goto(`${TARGET_URL}/login`);
    tests\bola-expansion-validation.spec.ts:12:    const financeLogin = await request.post('/api/auth/login', {
    tests\bola-expansion-validation.spec.ts:18:    expect(financeToken, 'Finance login failed').toBeDefined();
    tests\bola-expansion-validation.spec.ts:21:    const hrLogin = await request.post('/api/auth/login', {
    tests\bola-expansion-validation.spec.ts:27:    expect(hrToken, 'HR login failed').toBeDefined();
    tests\bola-expansion-validation.spec.ts:30:    const riderLogin = await request.post('/api/auth/login', {
    tests\bola-expansion-validation.spec.ts:35:    expect(riderToken, 'Rider login failed').toBeDefined();
    tests\security-bola-prevention.spec.ts:10:    const financeLogin = await request.post('/api/auth/login', {
    tests\security-bola-prevention.spec.ts:18:    const hrLogin = await request.post('/api/auth/login', {
    tests\next-gen-audit.spec.ts:16:    const adminLogin = await request.post(`${TARGET_URL}/api/auth/login`, {
    tests\next-gen-audit.spec.ts:37:    const hrLogin = await request.post(`${TARGET_URL}/api/auth/login`, {
    tests\next-gen-audit.spec.ts:58:    await page.goto(`${TARGET_URL}/login`);
    tests\hybrid-e2e-lifecycle.spec.ts:16:async function login(page: Page, email: string, password: string, expectedHeading: RegExp) {
    tests\hybrid-e2e-lifecycle.spec.ts:42:  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    tests\hybrid-e2e-lifecycle.spec.ts:58:      await login(page, PERSONNEL.email, PERSONNEL.password, /Delivery Center/i);
    tests\hybrid-e2e-lifecycle.spec.ts:94:      // Re-login as Admin
    tests\hybrid-e2e-lifecycle.spec.ts:96:      await login(page, ADMIN.email, ADMIN.password, 'Dispatch Console');
    tests\rider-security.spec.ts:16:    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
    tests\rider-security.spec.ts:19:    const { token } = await loginRes.json();
    tests\rider-security.spec.ts:42:    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
    tests\rider-security.spec.ts:45:    const { token } = await loginRes.json();
    tests\messaging-e2e.spec.ts:18:async function login(email: string, password: string) {
    tests\messaging-e2e.spec.ts:20:  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    tests\messaging-e2e.spec.ts:38:    const admin = await login(ADMIN.email, ADMIN.password);
    tests\messaging-e2e.spec.ts:39:    const rider = await login(RIDER.email, RIDER.password!);
    tests\messaging-e2e.spec.ts:110:  conversation: ConversationSummary; rider: Awaited<ReturnType<typeof login>>;
    tests\messaging-e2e.spec.ts:115:  const admin = await login(ADMIN.email, ADMIN.password);
    tests\messaging-e2e.spec.ts:116:  const rider = await login(RIDER.email, RIDER.password!);
    tests\messaging-e2e.spec.ts:167:  await page.locator('#login-password').fill(ADMIN.password);
    tests\personnel-to-admin-lifecycle.spec.ts:7:async function login(page: Page, email: string, password: string) {
    tests\personnel-to-admin-lifecycle.spec.ts:8:  await page.goto('/login');
    tests\personnel-to-admin-lifecycle.spec.ts:9:  await page.locator('#login-email').fill(email);
    tests\personnel-to-admin-lifecycle.spec.ts:10:  await page.locator('#login-password').fill(password);
    tests\personnel-to-admin-lifecycle.spec.ts:48:  await login(personnelPage, PERSONNEL.email, PERSONNEL.password);
    tests\personnel-to-admin-lifecycle.spec.ts:54:  await login(adminPage, ADMIN.email, ADMIN.password);
    tests\web-requests.spec.ts:6:    await page.goto('http://localhost:5173/login');
    tests\personnel-lifecycle.spec.ts:16:    await page.goto(`${TARGET_URL}/login`);
    tests\personnel-lifecycle.spec.ts:23:    const loginRes = await request.post(`${TARGET_URL}/api/auth/login`, {
    tests\personnel-lifecycle.spec.ts:26:    const { token } = await loginRes.json();
    tests\web-mobile-workflow.spec.ts:72:async function login(page: Page, email: string, password: string, expectedHeading: RegExp) {
    tests\web-mobile-workflow.spec.ts:74:  await page.locator('#login-email').fill(email);
    tests\web-mobile-workflow.spec.ts:75:  await page.locator('#login-password').fill(password);
    tests\web-mobile-workflow.spec.ts:123:  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    tests\web-mobile-workflow.spec.ts:134:  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    tests\interceptor-ui.spec.ts:13:      if (url.includes('/api/auth/login')) {
    tests\interceptor-ui.spec.ts:29:              attendance_status: 'present', current_lat: 1.1, current_lng: 1.1, user_status: 'active'
    tests\pagination-sorting-verification.spec.ts:15:    const adminLogin = await request.post(`${API_BASE_URL}/api/auth/login`, {
    tests\pagination-sorting-verification.spec.ts:22:      throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
    tests\tracking-sync-audit.spec.ts:16:    await page.goto(`${TARGET_URL}/login`);
    tests\tracking-sync-audit-local.spec.ts:11:    await page.goto(`${TARGET_URL}/login`);
    tests\e2e\tc1-dispatch.spec.ts:4:  // Mock login for scaffold
    tests\e2e\tc1-dispatch.spec.ts:5:  console.log('Playwright: Mocking login');
    tests\deep-rapid-check.spec.ts:19:    const aRes = await request.post('/api/auth/login', { data: { email: 'admin@company.com', password: 'password' } });
    tests\deep-rapid-check.spec.ts:22:    const hrRes = await request.post('/api/auth/login', { data: { email: 'john.hr@company.com', password: 'Hon010125@' } });
    tests\deep-rapid-check.spec.ts:25:    const fiRes = await request.post('/api/auth/login', { data: { email: 'jose.finance@company.com', password: 'Hon010125@' } });
    tests\deep-rapid-check.spec.ts:105:    const riderLogin = await request.post('/api/auth/login', { data: { email: 'rider1@company.com', password: 'rider1' } });
    server\routes\auth.ts:4:import { loginSchema, signupSchema } from '../schemas/authSchema';
    server\routes\auth.ts:81:router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    server\routes\auth.ts:129:        challenge: await issueAuthChallenge(user.id, 'mfa_login'),
    server\routes\auth.ts:140:    // A fresh rider login starts connected but off duty.
    server\routes\auth.ts:247:// Start MFA enrollment after the password was verified by /login.
    server\routes\auth.ts:332:// Complete MFA login using the challenge issued after password verification.
    server\routes\auth.ts:333:router.post('/mfa/verify-login', async (req: Request, res: Response) => {
    server\routes\auth.ts:335:    const { challenge: loginChallenge, token, rememberMe: requestedRememberMe = false } = req.body || {};
    server\routes\auth.ts:337:    if (!loginChallenge || !token) return res.status(401).json({ error: 'Authentication challenge required' });
    server\routes\auth.ts:339:    const pendingLogin = await findAuthChallenge(loginChallenge, 'mfa_login');
    server\routes\auth.ts:340:    if (!pendingLogin) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    server\routes\auth.ts:343:    if (users.length === 0) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    server\routes\auth.ts:347:      return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    server\routes\auth.ts:358:      if (!await consumeAuthChallenge(loginChallenge, 'mfa_login')) {
    server\routes\auth.ts:359:        return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    tests\unit\admin-lint-attendance.test.tsx:11:it('shows compact icon-led attendance summary tiles on mobile', async () => {
    tests\unit\admin-lint-attendance.test.tsx:19:  expect(summary?.querySelectorAll('[data-attendance-stat]')).toHaveLength(5);
    tests\unit\admin-lint-attendance.test.tsx:33:  expect([...summary!.querySelectorAll('[data-attendance-stat]')].every(tile => tile.className.includes('col-span-1'))).toBe(true);
    tests\unit\admin-lint-attendance.test.tsx:34:  const firstTile = summary!.querySelector('[data-attendance-stat]')!;
    tests\unit\admin-lint-attendance.test.tsx:44:  const search = getByLabelText('Search attendance records');
    server\routes\__tests__\users-duty.test.ts:36:  it('rejects absent attendance while a shift is open without changing rider state', async () => {
    server\routes\__tests__\users-duty.test.ts:39:    const response = await request(app).post('/api/users/rider-1/attendance').send({ status: 'absent', reason: 'Sick' });
    server\routes\__tests__\users-duty.test.ts:44:    expect(connectionQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(false);
    server\routes\__tests__\users-duty.test.ts:85:    expect(connectionQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs SET off_duty_time'), ['rider-1', '2026-10-21 08:00:00']);
    server\routes\analytics.ts:453:      JOIN attendance_logs al ON u.id = al.rider_id
    server\routes\__tests__\rider-avatars.test.ts:101:  it('returns null for a legacy rider login profile', async () => {
    server\routes\__tests__\rider-avatars.test.ts:107:    const response = await request(app).post('/api/auth/login')
    server\routes\__tests__\rider-avatars.test.ts:117:  it('returns the saved rider avatar on login instead of replacing it with the generated default', async () => {
    server\routes\__tests__\rider-avatars.test.ts:127:    const response = await request(app).post('/api/auth/login')
    server\routes\__tests__\rider-avatars.test.ts:134:  it('normalizes an omitted avatar column in a legacy login row to null', async () => {
    server\routes\__tests__\rider-avatars.test.ts:140:    const response = await request(app).post('/api/auth/login')
    server\routes\__tests__\request-assignment-queue.test.ts:60:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
    server\routes\__tests__\request-assignment-queue.test.ts:71:  it('allows direct same-day assignment to an online on-duty rider with no attendance report', async () => {
    server\routes\__tests__\request-assignment-queue.test.ts:76:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: null }]];
    server\routes\__tests__\request-assignment-queue.test.ts:87:  it('allows same-day batch assignment to an online on-duty rider with no attendance report', async () => {
    server\routes\__tests__\request-assignment-queue.test.ts:96:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: null }]];
    server\routes\__tests__\request-assignment-queue.test.ts:108:  it('does not apply today attendance, duty, or presence checks to future tasks', async () => {
    server\routes\__tests__\request-assignment-queue.test.ts:112:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 0, attendance_status: 'absent' }]];
    server\routes\__tests__\request-assignment-queue.test.ts:132:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
    server\routes\__tests__\request-assignment-queue.test.ts:173:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
    server\routes\__tests__\request-assignment-queue.test.ts:280:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
    server\routes\__tests__\request-assignment-queue.test.ts:299:      if (sql.includes('SELECT u.id, u.name')) return [[{ id: 'rider-1', name: 'Rider One', is_on_duty: 1, attendance_status: 'present' }]];
    server\index.ts:102:  max: 10, // Limit each IP to 10 login attempts per window
    server\index.ts:103:  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    server\index.ts:107:app.use('/api/auth/login', authRateLimiter);
    server\routes\users.ts:11:import { approveLateCheckIn, endShiftSession, getCurrentShiftSession, getShiftSessionsForDate, setNonPresentAttendance, setRiderAvailability, ShiftSessionError, startShiftSession } from '../services/shiftSessions';
    server\routes\users.ts:99:             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = ${PH_TODAY_SQL} LIMIT 1) as attendance_status
    server\routes\users.ts:123:// GET /attendance/daily (Admin only)
    server\routes\users.ts:124:router.get('/attendance/daily', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    server\routes\users.ts:148:      LEFT JOIN attendance_logs al ON u.id = al.rider_id AND al.date = ?
    server\routes\users.ts:159:    console.error('Fetch attendance error:', error);
    server\routes\users.ts:160:    res.status(500).json({ error: 'Failed to fetch attendance' });
    server\routes\users.ts:164:// GET /me/attendance (Rider only)
    server\routes\users.ts:180:router.post('/attendance/:riderId/late-check-in-approval', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    server\routes\users.ts:188:      riderId, type: 'attendance', status: 'absent', absence_source: 'automatic_no_show',
    server\routes\users.ts:196:    io?.to(riderId).emit('attendance-updated', { status: 'absent', late_checkin_approved: true, date });
    server\routes\users.ts:207:router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    server\routes\users.ts:210:      `SELECT status, reason, absence_source, auto_absent_at, late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`,
    server\routes\users.ts:215:    res.status(500).json({ error: 'Failed to fetch personal attendance' });
    server\routes\users.ts:219:// POST /:id/attendance (Rider only - Morning Check-in)
    server\routes\users.ts:220:router.post('/:id/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    server\routes\users.ts:229:      return res.status(400).json({ error: 'Invalid attendance status' });
    server\routes\users.ts:238:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    server\routes\users.ts:239:      io.to(id).emit('attendance-updated', { status });
    server\routes\users.ts:256:    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    server\routes\users.ts:259:    io.to(id).emit('attendance-updated', { status });
    server\routes\users.ts:286:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status: 'present' });
    server\routes\users.ts:287:      io.to(id).emit('attendance-updated', { status: 'present' });
    server\routes\users.ts:309:    console.log('ðŸš€ DEV: Resetting today\'s attendance logs...');
    server\routes\users.ts:310:    await pool.query(`DELETE FROM attendance_logs WHERE date = ${PH_TODAY_SQL}`);
    server\routes\users.ts:356:// DELETE /attendance/:riderId (Admin only) - Clear absence for today
    server\routes\users.ts:357:router.delete('/attendance/:riderId', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    server\routes\users.ts:362:    const [rows]: any = await pool.query(`SELECT absence_source FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`, [riderId]);
    server\routes\users.ts:366:    await pool.query(`DELETE FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL}`, [riderId]);
    server\routes\users.ts:369:    io.to(riderId).emit('attendance-cleared', { message: 'Your absence has been cleared by Admin. You can now start your shift.' });
    server\routes\users.ts:370:    io.to(riderId).emit('attendance-updated', { status: null });
    server\routes\users.ts:375:      message: `Rider attendance cleared for ${riderId}`,
    server\routes\users.ts:381:    res.status(500).json({ error: 'Failed to clear attendance' });
    server\routes\requests.ts:53:           (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')) LIMIT 1) as attendance_status
    server\routes\requests.ts:66:  if (rider.attendance_status === 'absent') return { code: 'RIDER_UNAVAILABLE', message: 'Rider is absent today.' };
    server\routes\requests.ts:67:  if (rider.attendance_status === 'on_leave') return { code: 'RIDER_UNAVAILABLE', message: 'Rider is on leave today.' };
    server\routes\requests.ts:762:             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')) LIMIT 1) as attendance_status
    server\routes\__tests__\auth-security.test.ts:109:  it('does not let a caller choose the account ID for MFA login', async () => {
    server\routes\__tests__\auth-security.test.ts:110:    const response = await request(app).post('/api/auth/mfa/verify-login').send({
    server\routes\__tests__\auth-security.test.ts:126:  it('issues an MFA login challenge only after password verification', async () => {
    server\routes\__tests__\auth-security.test.ts:132:    const response = await request(app).post('/api/auth/login').send({ email: 'rider@example.test', password: 'correct' });
    server\routes\__tests__\auth-security.test.ts:138:    expect(authChallenges.issueAuthChallenge).toHaveBeenCalledWith('rider-1', 'mfa_login');
    server\routes\__tests__\auth-security.test.ts:141:  it('keeps the sole admin account login behavior and stored credentials untouched', async () => {
    server\routes\__tests__\auth-security.test.ts:152:    const response = await request(app).post('/api/auth/login').send({
    server\routes\__tests__\attendance-daily.test.ts:33:describe('daily attendance API shift data', () => {
    server\routes\__tests__\attendance-daily.test.ts:48:    const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);
    server\routes\__tests__\attendance-daily.test.ts:66:    const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);
    server\routes\__tests__\attendance-daily.test.ts:75:  it('lets only admins approve a late check-in and emits confirmed attendance updates', async () => {
    server\routes\__tests__\attendance-daily.test.ts:80:    const unauthenticated = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval').send({ date: '2026-10-22' });
    server\routes\__tests__\attendance-daily.test.ts:81:    const forbidden = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
    server\routes\__tests__\attendance-daily.test.ts:83:    const response = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
    server\routes\__tests__\attendance-daily.test.ts:91:    expect(emit).toHaveBeenCalledWith('attendance-updated', { status: 'absent', late_checkin_approved: true, date: '2026-10-22' });
    server\routes\__tests__\attendance-daily.test.ts:97:    const response = await request(app).delete('/api/users/attendance/rider-1').set('Authorization', adminToken);
    src\app\utils\__tests__\riderAvailability.test.ts:5:  it('allows an online on-duty rider with no same-day attendance report', () => {
    src\app\utils\__tests__\riderAvailability.test.ts:6:    expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status: null }, true))
    src\app\utils\__tests__\riderAvailability.test.ts:10:  it.each(['absent', 'on_leave'] as const)('blocks a same-day rider with attendance status %s', (attendance_status) => {
    src\app\utils\__tests__\riderAvailability.test.ts:11:    expect(getRiderAvailability({ is_online: true, is_on_duty: true, attendance_status }, true).eligible).toBe(false);
    src\app\utils\__tests__\riderAvailability.test.ts:15:    expect(getRiderAvailability({ is_online: false, is_on_duty: true, attendance_status: 'present' }, true))
    src\app\utils\__tests__\riderAvailability.test.ts:17:    expect(getRiderAvailability({ is_online: true, is_on_duty: false, attendance_status: 'present' }, true))
    src\app\utils\__tests__\riderAvailability.test.ts:22:    expect(getRiderAvailability({ is_online: false, is_on_duty: true, attendance_status: null }, true))
    src\app\utils\__tests__\riderAvailability.test.ts:26:  it('ignores today attendance, presence, and duty for a future task', () => {
    src\app\utils\__tests__\riderAvailability.test.ts:27:    expect(getRiderAvailability({ is_online: false, is_on_duty: false, attendance_status: 'on_leave' }, false))
    server\services\__tests__\shiftSessions.test.ts:3:import { approveLateCheckIn, getCurrentShiftSession, getShiftSessionsForDate, startShiftSession, endShiftSession, setRiderAvailability } from '../shiftSessions';
    server\services\__tests__\shiftSessions.test.ts:6:  it('creates deterministic sessions preserving ended and open attendance times', () => {
    server\services\__tests__\shiftSessions.test.ts:12:      expect.objectContaining({ id: 'legacy_att-1', source_attendance_id: 'att-1', start_time: '2026-10-01 08:00:00', end_time: '2026-10-01 12:00:00', session_state: 'closed' }),
    server\services\__tests__\shiftSessions.test.ts:13:      expect.objectContaining({ id: 'legacy_att-2', source_attendance_id: 'att-2', start_time: '2026-10-01 13:00:00', end_time: null, session_state: 'legacy_unknown' }),
    server\services\__tests__\shiftSessions.test.ts:113:    expect(conn.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE attendance_logs SET status='present'"), ['att-1']);
    server\services\__tests__\shiftSessions.test.ts:115:    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(false);
    server\services\__tests__\shiftSessions.test.ts:130:    expect(conn.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs SET late_checkin_approved_by=?'), ['admin-1', 'rider-1', '2026-10-22']);
    server\services\__tests__\shiftSessions.test.ts:159:  it('records attendance and opens a shift atomically when the rider goes On Duty', async () => {
    server\services\__tests__\shiftSessions.test.ts:164:        : sql.includes('SELECT status FROM attendance_logs')
    server\services\__tests__\shiftSessions.test.ts:173:    expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toBe(true);
    server\services\__tests__\shiftSessions.test.ts:184:        : sql.includes('SELECT status FROM attendance_logs')
    server\services\messaging.ts:26:  'attendance_logs',
    server\services\__tests__\authChallenges.test.ts:16:    const token = await issueAuthChallenge('user-1', 'mfa_login');
    server\services\__tests__\authChallenges.test.ts:22:    expect(insert?.[1]).toEqual([expect.any(String), 'user-1', 'mfa_login', '{}', expect.any(String)]);
    server\services\__tests__\shiftSchedule.test.ts:15:describe('attendance auto-absence schema', () => {
    server\services\__tests__\shiftSchedule.test.ts:24:    const alters = query.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith('ALTER TABLE attendance_logs'));
    server\services\__tests__\shiftSchedule.test.ts:36:      const addedColumn = sql.match(/ALTER TABLE attendance_logs ADD COLUMN ([a-z_]+)/)?.[1];
    server\services\__tests__\shiftSchedule.test.ts:44:    const alters = query.mock.calls.map(([sql]) => String(sql)).filter((sql) => sql.startsWith('ALTER TABLE attendance_logs'));
    server\services\authChallenges.ts:4:export type AuthChallengePurpose = 'mfa_setup' | 'mfa_setup_verify' | 'mfa_login' | 'password_reset';
    server\services\shiftSchedule.ts:70:  const [attendanceColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    server\services\shiftSchedule.ts:71:    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_logs'
    server\services\shiftSchedule.ts:73:  const existingAttendanceColumns = new Set((attendanceColumns as any[]).map(row => row.COLUMN_NAME));
    server\services\shiftSchedule.ts:75:    await db.query('ALTER TABLE attendance_logs ADD COLUMN absence_source VARCHAR(32) NULL');
    server\services\shiftSchedule.ts:78:    await db.query('ALTER TABLE attendance_logs ADD COLUMN auto_absent_at DATETIME NULL');
    server\services\shiftSchedule.ts:81:    await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_by VARCHAR(255) NULL');
    server\services\shiftSchedule.ts:84:    await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_at DATETIME NULL');
    server\services\shiftCutoff.ts:38:    await conn.query('UPDATE attendance_logs SET off_duty_time=? WHERE rider_id=? AND date=?', [cutoffAt, riderId, date]);
    server\services\shiftCutoff.ts:88:      const [attendance] = await conn.query(
    server\services\shiftCutoff.ts:89:        'SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ? LIMIT 1 FOR UPDATE',
    server\services\shiftCutoff.ts:92:      if (attendance[0]) { await conn.commit(); continue; }
    server\services\shiftCutoff.ts:93:      await conn.query(`INSERT INTO attendance_logs
    server\services\shiftCutoff.ts:119:        riderId: rider.id, riderName: rider.name || 'Rider', type: 'attendance',
    server\services\shiftCutoff.ts:122:      io?.to(rider.id).emit('attendance-updated', { status: 'absent', absence_source: 'automatic_no_show', date });
    server\services\__tests__\shiftCutoff.test.ts:21:    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE attendance_logs'), ['2026-10-22 19:00:00', 'rider-1', '2026-10-22']);
    server\services\__tests__\shiftCutoff.test.ts:28:    let attendanceRow = existingAttendance;
    server\services\__tests__\shiftCutoff.test.ts:31:      if (sql.includes('SELECT status FROM attendance_logs')) return [attendanceRow ? [attendanceRow] : []];
    server\services\__tests__\shiftCutoff.test.ts:32:      if (sql.includes('INSERT INTO attendance_logs')) {
    server\services\__tests__\shiftCutoff.test.ts:34:        attendanceRow = { status: 'absent' };
    server\services\__tests__\shiftCutoff.test.ts:75:      expect.stringContaining('INSERT INTO attendance_logs'),
    server\services\__tests__\shiftCutoff.test.ts:96:  ])('preserves an existing %s attendance row (%s)', async (status) => {
    server\services\__tests__\shiftCutoff.test.ts:112:    expect(fixture.connectionQuery.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO attendance_logs'))).toHaveLength(1);
    server\services\__tests__\shiftCutoff.test.ts:123:    expect(emit).toHaveBeenCalledWith('attendance-updated', expect.objectContaining({ status: 'absent', absence_source: 'automatic_no_show' }));
    server\services\shiftSessions.ts:27:    const [attendanceRows] = await conn.query(`SELECT id, status, absence_source,
    server\services\shiftSessions.ts:28:      late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs
    server\services\shiftSessions.ts:30:    const attendance = attendanceRows[0];
    server\services\shiftSessions.ts:31:    if (attendance && attendance.status !== 'present') {
    server\services\shiftSessions.ts:32:      const approvedAutoAbsence = attendance.status === 'absent'
    server\services\shiftSessions.ts:33:        && attendance.absence_source === 'automatic_no_show'
    server\services\shiftSessions.ts:34:        && attendance.late_checkin_approved_by
    server\services\shiftSessions.ts:35:        && attendance.late_checkin_approved_at;
    server\services\shiftSessions.ts:39:      await conn.query(`UPDATE attendance_logs SET status='present', check_in_time=${NOW} WHERE id=?`, [attendance.id]);
    server\services\shiftSessions.ts:42:    if (!attendance) {
    server\services\shiftSessions.ts:43:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW})`, [`att_${crypto.randomUUID()}`, input.riderId]);
    server\services\shiftSessions.ts:45:    // Starting attendance opens a shift; going online is a separate rider action.
    server\services\shiftSessions.ts:59:      const [attendance] = await conn.query(`SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ${TODAY} LIMIT 1`, [input.riderId]);
    server\services\shiftSessions.ts:60:      if (attendance[0] && attendance[0].status !== 'present') {
    server\services\shiftSessions.ts:63:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW}) ON DUPLICATE KEY UPDATE check_in_time=IF(status='present',check_in_time,${NOW}), status='present'`, [`att_${crypto.randomUUID()}`, input.riderId]);
    server\services\shiftSessions.ts:93:    await conn.query(`UPDATE attendance_logs SET off_duty_time=${NOW} WHERE rider_id=? AND date=DATE(?)`, [input.riderId, open[0].start_time]);
    server\services\shiftSessions.ts:105:    if (open[0]) throw new ShiftSessionError('OPEN_SHIFT', 'End your current shift before changing attendance status.');
    server\services\shiftSessions.ts:107:    await conn.query(`INSERT INTO attendance_logs (id, rider_id, date, status, reason, check_in_time)
    server\services\shiftSessions.ts:126:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1 FOR UPDATE`, [input.riderId, input.date]);
    server\services\shiftSessions.ts:127:    const attendance = rows[0];
    server\services\shiftSessions.ts:128:    if (attendance?.status !== 'absent' || attendance.absence_source !== 'automatic_no_show' || attendance.late_checkin_approved_at) {
    server\services\shiftSessions.ts:131:    await conn.query(`UPDATE attendance_logs SET late_checkin_approved_by=?, late_checkin_approved_at=${NOW}
    server\services\shiftSessions.ts:135:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1`, [input.riderId, input.date]);
    src\app\utils\riderAvailability.ts:2:  attendance_status?: 'present' | 'absent' | 'on_leave' | null;
    src\app\utils\riderAvailability.ts:33:  const notice = rider.attendance_status ? undefined : 'NO REPORT';
    src\app\utils\riderAvailability.ts:37:  if (rider.attendance_status === 'on_leave') return blocked('ON LEAVE');
    src\app\utils\riderAvailability.ts:38:  if (rider.attendance_status === 'absent') return blocked('ABSENT');
    server\scripts\2026-10-22-weekday-auto-absence.sql:1:ALTER TABLE attendance_logs
    mobile-app\utils\__tests__\dashboardTransition.test.ts:14:  it('keeps the transition visible after auth finishes until the login route has been replaced', () => {
    mobile-app\utils\__tests__\dashboardTransition.test.ts:18:      loginRouteActive: true,
    mobile-app\utils\dashboardTransition.ts:4:  loginRouteActive?: boolean;
    mobile-app\utils\dashboardTransition.ts:18:  loginRouteActive = false,
    mobile-app\utils\dashboardTransition.ts:25:  if (isAuthenticating || (hasUser && (loginRouteActive || (tasksLoading && !tasksError)))) {
    mobile-app\utils\__tests__\auth-navigation.test.ts:8:  it('redirects unauthenticated users outside the login route after navigation is ready', () => {
    mobile-app\utils\__tests__\auth-navigation.test.ts:9:    expect(getAuthRedirect({ isLoading: false, user: null, firstSegment: '(tabs)', navigationReady: true })).toBe('/login');
    mobile-app\utils\authNavigation.ts:11:}): '/login' | '/(tabs)' | null => {
    mobile-app\utils\authNavigation.ts:14:  const inAuthGroup = firstSegment === 'login';
    mobile-app\utils\authNavigation.ts:15:  if (!user && !inAuthGroup) return '/login';
    mobile-app\utils\__tests__\api-auth-interceptor.test.ts:42:  it('does not invalidate a new login because an older token received a late 401', async () => {
    server\schemas\authSchema.ts:3:export const loginSchema = z.object({
    server\scripts\test-rider-idempotency.cjs:23:  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    server\scripts\test-rider-idempotency.cjs:27:  const token = loginRes.data.token;
    server\scripts\test-rider-idempotency.cjs:52:  const persLogin = await axios.post(`${API_URL}/auth/login`, {
    server\scripts\simulate-rider-movement.cjs:13:  const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    server\scripts\simulate-rider-movement.cjs:22:  const loginData = await loginRes.json();
    server\scripts\simulate-rider-movement.cjs:23:  const { token, user } = loginData;
    server\scripts\simulate-rider-movement-local.cjs:10:const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    server\scripts\simulate-rider-movement-local.cjs:17:  const loginData = await loginRes.json();
    server\scripts\simulate-rider-movement-local.cjs:18:  const { token, user } = loginData;
    src\app\components\QuickStartGuide.tsx:12:    // Show guide only on first login for each role
    src\app\components\PasswordResetOverlay.tsx:124:                    : 'This is your first login. Please set a private password to access your dashboard.'
    src\app\pages\Login.tsx:16:  const { login, user, isAuthenticated } = useAuth();
    src\app\pages\Login.tsx:18:  const [loginEmail, setLoginEmail] = useState('');
    src\app\pages\Login.tsx:19:  const [loginPassword, setLoginPassword] = useState('');
    src\app\pages\Login.tsx:48:      const result = await login(loginEmail.trim(), loginPassword, rememberMe);
    src\app\pages\Login.tsx:90:      const endpoint = mfaStep === 'setup' ? '/api/auth/mfa/setup-verify' : '/api/auth/mfa/verify-login';
    src\app\pages\Login.tsx:181:                key="login-step"
    src\app\pages\Login.tsx:204:                        <Label htmlFor="login-email" className="mb-2 block text-left text-sm font-semibold text-[#172b4d]">Email address</Label>
    src\app\pages\Login.tsx:208:                            id="login-email"
    src\app\pages\Login.tsx:212:                            value={loginEmail}
    src\app\pages\Login.tsx:220:                        <Label htmlFor="login-password" className="mb-2 block text-left text-sm font-semibold text-[#172b4d]">Password</Label>
    src\app\pages\Login.tsx:224:                            id="login-password"
    src\app\pages\Login.tsx:228:                            value={loginPassword}
    src\app\pages\Login.tsx:417:          alert("Password updated! Please login again with your new password.");
    src\app\context\AuthContext.tsx:8:  login: (email: string, password: string, rememberMe?: boolean) => Promise<{
    src\app\context\AuthContext.tsx:71:  const login: AuthContextType['login'] = async (email, password, rememberMe = false) => {
    src\app\context\AuthContext.tsx:73:      const response = await fetch(`${API_URL}/auth/login`, {
    src\app\context\AuthContext.tsx:175:        login,
    mobile-app\hooks\data\useDashboard.ts:69:          { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    mobile-app\hooks\data\useDashboard.ts:81:          router.replace('/login');
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:37:  it('allows a same-day online on-duty rider with no attendance report', () => {
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:38:    const { option } = renderModal({ rider: makeRider({ is_online: true, is_on_duty: true, attendance_status: null }) });
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:45:    ['Absent', { is_online: true, is_on_duty: true, attendance_status: 'absent' }],
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:46:    ['On Leave', { is_online: true, is_on_duty: true, attendance_status: 'on_leave' }],
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:47:    ['off duty', { is_online: true, is_on_duty: false, attendance_status: 'present' }],
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:48:    ['offline', { is_online: false, is_on_duty: true, attendance_status: 'present' }],
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:58:      rider: makeRider({ is_online: false, is_on_duty: false, attendance_status: 'absent' }),
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:67:      rider: makeRider({ is_online: false, is_on_duty: true, attendance_status: 'present' }),
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:75:      riders={[makeRider({ is_online: true, is_on_duty: true, attendance_status: null })]} onConfirm={onConfirm}
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:79:      riders={[makeRider({ is_online: false, is_on_duty: true, attendance_status: null })]} onConfirm={onConfirm}
    src\app\components\Admin\__tests__\interceptor-rider-availability.test.tsx:91:      rider: makeRider({ is_online: false, is_on_duty: false, attendance_status: 'absent' }),
    src\app\pages\Admin\__tests__\attendance-sessions.test.tsx:33:it('shows an attendance API error instead of presenting it as an empty day', async () => {
    src\app\pages\Admin\__tests__\attendance-sessions.test.tsx:37:    json: async () => ({ error: 'Failed to fetch attendance' }),
    src\app\pages\Admin\__tests__\attendance-sessions.test.tsx:41:  expect(screen.getAllByText(/Failed to fetch attendance/i).length).toBeGreaterThan(0);
    src\app\pages\Admin\__tests__\attendance-sessions.test.tsx:42:  expect(screen.queryByText('No attendance records found')).toBeNull();
    src\app\pages\Admin\__tests__\attendance-sessions.test.tsx:58:it('does not display a non-present attendance timestamp as a shift start', async () => {
    src\app\pages\Admin\__tests__\attendance-duty.test.tsx:36:it('renders current duty independently from attendance and shift progress', async () => {
    src\app\pages\Admin\__tests__\attendance-date-rollover.test.tsx:15:it('moves the default attendance view to the new Philippine date at midnight', async () => {
    src\app\pages\Admin\DispatchConsole.tsx:191:  // Listen for real-time attendance/duty/status changes to refresh the riders list
    src\app\pages\Admin\DispatchConsole.tsx:203:      // Refresh if it's an attendance or duty related notification
    src\app\pages\Admin\__tests__\attendance-auto-absence.test.tsx:49:  expect(fetchMock.mock.calls[1][0]).toContain('/api/users/attendance/rider-1/late-check-in-approval');
    src\app\pages\Admin\AttendanceDashboard.tsx:77:  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    src\app\pages\Admin\AttendanceDashboard.tsx:79:  const [attendanceError, setAttendanceError] = useState<string | null>(null);
    src\app\pages\Admin\AttendanceDashboard.tsx:81:  const attendanceRequestId = useRef(0);
    src\app\pages\Admin\AttendanceDashboard.tsx:110:    const requestId = ++attendanceRequestId.current;
    src\app\pages\Admin\AttendanceDashboard.tsx:113:      const res = await fetch(`/api/users/attendance/daily?date=${selectedDate}`, {
    src\app\pages\Admin\AttendanceDashboard.tsx:119:      if (requestId !== attendanceRequestId.current) return;
    src\app\pages\Admin\AttendanceDashboard.tsx:123:      if (requestId !== attendanceRequestId.current) return;
    src\app\pages\Admin\AttendanceDashboard.tsx:124:      const message = error instanceof Error ? error.message : 'Unable to reach attendance service';
    src\app\pages\Admin\AttendanceDashboard.tsx:126:      if (!silent) toast.error(`Failed to load attendance records: ${message}`);
    src\app\pages\Admin\AttendanceDashboard.tsx:129:      if (requestId === attendanceRequestId.current && !silent) setLoading(false);
    src\app\pages\Admin\AttendanceDashboard.tsx:176:    total: attendance.length,
    src\app\pages\Admin\AttendanceDashboard.tsx:177:    present: attendance.filter(a => a.status === 'present').length,
    src\app\pages\Admin\AttendanceDashboard.tsx:178:    absent: attendance.filter(a => a.status === 'absent').length,
    src\app\pages\Admin\AttendanceDashboard.tsx:179:    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    src\app\pages\Admin\AttendanceDashboard.tsx:180:    noReport: attendance.filter(a => !a.status).length,
    src\app\pages\Admin\AttendanceDashboard.tsx:183:  const filteredAttendance = attendance.filter(a =>
    src\app\pages\Admin\AttendanceDashboard.tsx:207:      const res = await fetch(`/api/users/attendance/${riderId}`, {
    src\app\pages\Admin\AttendanceDashboard.tsx:224:      const response = await fetch(`/api/users/attendance/${record.rider_id}/late-check-in-approval`, {
    src\app\pages\Admin\AttendanceDashboard.tsx:363:        {attendanceError && (
    src\app\pages\Admin\AttendanceDashboard.tsx:365:            <span>Could not load attendance for {selectedDate}: {attendanceError}</span>
    src\app\pages\Admin\AttendanceDashboard.tsx:381:              data-attendance-stat
    src\app\pages\Admin\AttendanceDashboard.tsx:414:                  aria-label={mobileSearchOpen ? 'Close attendance search' : 'Search attendance records'}
    src\app\pages\Admin\AttendanceDashboard.tsx:416:                  aria-controls="mobile-attendance-search"
    src\app\pages\Admin\AttendanceDashboard.tsx:439:                  id="mobile-attendance-search"
    src\app\pages\Admin\AttendanceDashboard.tsx:440:                  aria-label="Search attendance records"
    src\app\pages\Admin\AttendanceDashboard.tsx:462:            ) : attendanceError ? (
    src\app\pages\Admin\AttendanceDashboard.tsx:470:                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
    src\app\pages\Admin\AttendanceDashboard.tsx:598:                {attendanceError ? (
    src\app\pages\Admin\AttendanceDashboard.tsx:609:                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
    mobile-app\components\__tests__\ShiftControlDrawer.test.tsx:17:      attendanceStatus: 'present',
    mobile-app\components\__tests__\ShiftControlDrawer.test.tsx:59:  it('shows On Duty directly before attendance exists', () => {
    mobile-app\components\__tests__\ShiftControlDrawer.test.tsx:63:      attendanceStatus: null,
    src\app\components\Admin\Dispatch\__tests__\rider-selection-availability.test.tsx:23:  it('shows only the rider identity and online status when no attendance report exists', () => {
    src\app\components\Admin\Dispatch\__tests__\rider-selection-availability.test.tsx:24:    const onSelect = renderList({ is_online: true, is_on_duty: true, attendance_status: null });
    src\app\components\Admin\Dispatch\__tests__\rider-selection-availability.test.tsx:47:    const onSelect = renderList({ is_online: true, is_on_duty: true, attendance_status: 'absent' });
    src\app\components\Admin\Dispatch\__tests__\rider-selection-availability.test.tsx:58:    const onSelect = renderList({ is_online: false, is_on_duty: false, attendance_status: 'absent' }, futureDate);
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:33:      isOnDuty: false, hasOpenShift: false, attendanceStatus: null, isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:38:  it('shows On Duty as the action that records attendance', async () => {
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:52:      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'present', isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:66:      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'absent', isLateCheckInApproved: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:80:      isOnDuty: false, hasOpenShift: false, attendanceStatus: 'absent', isLateCheckInApproved: false,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:93:      isOnDuty: false, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:107:    expect(screen.getByTestId('attendance-report-modal').props.visible).toBe(true);
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:121:      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:137:      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:150:      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
    mobile-app\components\__tests__\ShiftControlCard.test.tsx:162:      isOnDuty: true, hasOpenShift: true, attendanceStatus: 'present', isShiftStatusReady: true,
    src\app\components\Admin\Dispatch\__tests__\request-details-availability.test.tsx:30:  is_online: true, attendance_status: null } as User & RiderAvailabilityInput;
    mobile-app\components\AttendanceLockout.tsx:101:              Your attendance has been updated. You can now access your dashboard.
    src\app\pages\Admin\AdminLayout.tsx:30:type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance';
    src\app\pages\Admin\AdminLayout.tsx:37:  { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    src\app\pages\Admin\AdminLayout.tsx:219:                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
    src\app\pages\Admin\AdminLayout.tsx:226:                   System / <span className="text-slate-900">{currentView === 'calendar' ? 'Task Schedule' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Accounts' : currentView === 'analytics' ? 'Analytics' : currentView === 'attendance' ? 'Rider Attendance' : 'Themes'}</span>
    src\app\pages\Admin\AdminLayout.tsx:268:        <main className={cn("min-h-0 min-w-0 flex-1 overscroll-contain pb-[env(safe-area-inset-bottom)]", (currentView === 'dispatch' || currentView === 'calendar' || currentView === 'messages' || currentView === 'rider-map' || currentView === 'attendance') ? "overflow-hidden" : "overflow-y-auto") }>
    src\app\pages\Admin\AdminLayout.tsx:280:            {currentView === 'shift-hours' && <ShiftHours onOpenAttendance={() => setCurrentView('attendance')} />}
    src\app\pages\Admin\AdminLayout.tsx:282:            {currentView === 'attendance' && <AttendanceDashboard />}
    src\app\components\Admin\Dispatch\__tests__\assignment-flow.test.tsx:9:  is_online: true, attendance_status: 'present' } as User & RiderAvailabilityInput;
    mobile-app\components\AttendanceGate.tsx:31:  const { attendanceStatus, isShiftStatusReady, checkIn } = useLocation();
    mobile-app\components\AttendanceGate.tsx:54:  if (!isShiftStatusReady || attendanceStatus !== null) return null;
    mobile-app\components\AttendanceGate.tsx:57:    <Modal testID="attendance-report-modal" visible={visible} animationType="slide" transparent={false} onRequestClose={closeReport}>
    src\app\components\Admin\Dispatch\RiderSelectionList.tsx:10:  attendance_status?: 'present' | 'absent' | 'on_leave' | null;
    mobile-app\app\__tests__\today-start-shift.test.tsx:17:  useLocation: jest.fn(() => ({ isOnDuty: false, hasOpenShift: false, isShiftStatusReady: true, isNetworkReachable: true, attendanceStatus: null, checkIn: mockCheckIn, toggleDuty: mockToggleDuty })),
    mobile-app\app\__tests__\today-start-shift.test.tsx:35:    attendanceStatus: null, checkIn: mockCheckIn, toggleDuty: mockToggleDuty,
    mobile-app\app\__tests__\today-start-shift.test.tsx:39:it('shows On Duty directly after login and sends one duty request', async () => {
    mobile-app\app\__tests__\today-start-shift.test.tsx:56:    attendanceStatus: null,
    mobile-app\app\__tests__\today-start-shift.test.tsx:89:    attendanceStatus: 'present',
    mobile-app\app\__tests__\today-start-shift.test.tsx:112:    attendanceStatus: null,
    mobile-app\app\__tests__\today-start-shift.test.tsx:130:    attendanceStatus: 'present',
    mobile-app\services\__tests__\apiService.test.ts:85:  it('submits present attendance with the stable start operation id', async () => {
    mobile-app\services\__tests__\apiService.test.ts:90:    expect(api.post).toHaveBeenCalledWith('/api/users/rider-1/attendance', {
    mobile-app\app\__tests__\login.test.tsx:4:import LoginScreen from '../login';
    mobile-app\app\__tests__\login.test.tsx:11:  useAuth: () => ({ login: mockLogin }),
    mobile-app\app\__tests__\login.test.tsx:44:        testID: 'login_hero_curve_path',
    mobile-app\app\__tests__\login.test.tsx:110:describe('mobile login screen', () => {
    mobile-app\app\__tests__\login.test.tsx:111:  it('keeps the branded login available while checking connectivity', () => {
    mobile-app\app\__tests__\login.test.tsx:116:    expect(getByTestId('login_brand_lockup')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:117:    expect(getByTestId('login_email_input')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:123:    const hero = getByTestId('login_hero_image');
    mobile-app\app\__tests__\login.test.tsx:124:    expect(within(hero).getByTestId('login_hero_rider').props.source).toBeDefined();
    mobile-app\app\__tests__\login.test.tsx:125:    const brandLockup = within(hero).getByTestId('login_brand_lockup');
    mobile-app\app\__tests__\login.test.tsx:126:    const brandWordmark = within(brandLockup).getByTestId('login_brand_wordmark');
    mobile-app\app\__tests__\login.test.tsx:127:    const heroMessage = within(brandLockup).getByTestId('login_hero_message');
    mobile-app\app\__tests__\login.test.tsx:130:    const formCard = getByTestId('login_form_card');
    mobile-app\app\__tests__\login.test.tsx:131:    expect(within(formCard).queryByTestId('login_brand_wordmark')).toBeNull();
    mobile-app\app\__tests__\login.test.tsx:137:    expect(StyleSheet.flatten(getByTestId('login_footer_image').props.style).height).toBeGreaterThan(300);
    mobile-app\app\__tests__\login.test.tsx:138:    expect(getByTestId('login_hero_curve')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:139:    expect(getByTestId('login_hero_curve_path').props.accessibilityLabel).toBe(
    mobile-app\app\__tests__\login.test.tsx:142:    expect(getByTestId('login_hero_curve_path').props.accessibilityValue.text).toBe('#F8FAFC');
    mobile-app\app\__tests__\login.test.tsx:143:    expect(getByTestId('login_email_input')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:146:  it('places a keyboard-aware scroll view around the login form', () => {
    mobile-app\app\__tests__\login.test.tsx:148:    const keyboardContainer = getByTestId('login_keyboard_container');
    mobile-app\app\__tests__\login.test.tsx:149:    const scrollView = within(keyboardContainer).getByTestId('login_scroll_view');
    mobile-app\app\__tests__\login.test.tsx:163:    const initialHeroHeight = StyleSheet.flatten(getByTestId('login_hero_image').props.style).height;
    mobile-app\app\__tests__\login.test.tsx:164:    const initialHeroTopPadding = StyleSheet.flatten(getByTestId('login_hero_top_row').props.style).paddingTop;
    mobile-app\app\__tests__\login.test.tsx:168:    expect(StyleSheet.flatten(getByTestId('login_hero_image').props.style).height).toBe(initialHeroHeight);
    mobile-app\app\__tests__\login.test.tsx:169:    expect(StyleSheet.flatten(getByTestId('login_hero_top_row').props.style).paddingTop).toBe(initialHeroTopPadding);
    mobile-app\app\__tests__\login.test.tsx:170:    expect(StyleSheet.flatten(getByTestId('login_keyboard_cover').props.style).height).toBeGreaterThan(0);
    mobile-app\app\__tests__\login.test.tsx:171:    expect(getByTestId('login_footer_image')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:172:    expect(queryByTestId('login_hero_message')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:175:  it('keeps the login form mounted and disables duplicate submissions while authentication is pending', async () => {
    mobile-app\app\__tests__\login.test.tsx:179:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:180:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:181:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:183:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:184:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:187:    expect(getByTestId('login_pin_input')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:188:    expect(getByTestId('login_sign_in_button').props.accessibilityState.disabled).toBe(true);
    mobile-app\app\__tests__\login.test.tsx:189:    expect(getByTestId('login_submit_spinner')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:192:    expect(getByTestId('login_pin_input')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:199:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:200:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:201:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:203:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:207:    expect(getByTestId('login_pin_input')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:208:    expect(getByTestId('login_submit_spinner')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:209:    expect(queryByTestId('login_pin_slot_0')).toBeTruthy();
    mobile-app\app\__tests__\login.test.tsx:215:    fireEvent.changeText(getByTestId('login_email_input'), 'not-an-email');
    mobile-app\app\__tests__\login.test.tsx:216:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:223:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:224:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:225:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:227:    expect(queryByTestId('login_parcel_mark')).toBeNull();
    mobile-app\app\__tests__\login.test.tsx:228:    expect(getAllByTestId(/^login_pin_slot_/)).toHaveLength(4);
    mobile-app\app\__tests__\login.test.tsx:234:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:240:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:241:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:242:    const pinOptions = await waitFor(() => getByTestId('login_pin_options_row'));
    mobile-app\app\__tests__\login.test.tsx:245:    const keepSignedIn = await waitFor(() => getByTestId('login_keep_signed_in_checkbox'));
    mobile-app\app\__tests__\login.test.tsx:248:    fireEvent.changeText(getByTestId('login_pin_input'), '1234');
    mobile-app\app\__tests__\login.test.tsx:249:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:256:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:257:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:258:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:263:    expect(getByTestId('login_pin_slot_3').props.accessibilityLabel).toBe('PIN digit 4');
    mobile-app\app\__tests__\login.test.tsx:268:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:269:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:270:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:273:    fireEvent.press(getByTestId('login_change_email_button'));
    mobile-app\app\__tests__\login.test.tsx:274:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:276:    const clearedPin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:283:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:284:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:285:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:287:    fireEvent.press(getByTestId('login_sign_in_button'));
    mobile-app\app\__tests__\login.test.tsx:296:    fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
    mobile-app\app\__tests__\login.test.tsx:297:    fireEvent.press(getByTestId('login_continue_button'));
    mobile-app\app\__tests__\login.test.tsx:298:    const pin = await waitFor(() => getByTestId('login_pin_input'));
    mobile-app\app\__tests__\login.test.tsx:300:    fireEvent.press(getByTestId('login_sign_in_button'));
    src\app\components\Admin\DevSimulator.tsx:40:            : `Today's attendance logs have been cleared.`
    mobile-app\app\_layout.tsx:105:    loginRouteActive: segments[0] === 'login',
    mobile-app\app\_layout.tsx:117:        <Stack.Screen name="login" />
    mobile-app\app\login.tsx:23:const loginHero = require('../assets/images/login-hero-rider.png');
    mobile-app\app\login.tsx:24:const loginRoadFooter = require('../assets/images/login-road-footer.png');
    mobile-app\app\login.tsx:26:const loginSurfaceColor = '#F8FAFC';
    mobile-app\app\login.tsx:36:  const { login } = useAuth();
    mobile-app\app\login.tsx:150:      const result = await login(email, finalPassword, keepSignedIn);
    mobile-app\app\login.tsx:243:      <View testID="login_hero_image" style={[styles.heroBackground, { height: heroHeight }]}>
    mobile-app\app\login.tsx:245:          testID="login_hero_rider"
    mobile-app\app\login.tsx:246:          source={loginHero}
    mobile-app\app\login.tsx:251:        <View testID="login_hero_top_row" style={[styles.heroTopRow, { paddingTop: (StatusBar.currentHeight ?? verticalScale(24)) + verticalScale(6) }]}>
    mobile-app\app\login.tsx:259:          testID="login_brand_lockup"
    mobile-app\app\login.tsx:263:            testID="login_brand_wordmark"
    mobile-app\app\login.tsx:268:          <View testID="login_hero_message" style={styles.heroMessage}>
    mobile-app\app\login.tsx:274:          testID="login_hero_curve"
    mobile-app\app\login.tsx:283:            fill={loginSurfaceColor}
    mobile-app\app\login.tsx:289:          testID="login_footer_image"
    mobile-app\app\login.tsx:290:          source={loginRoadFooter}
    mobile-app\app\login.tsx:297:        testID="login_keyboard_cover"
    mobile-app\app\login.tsx:303:          testID="login_keyboard_container"
    mobile-app\app\login.tsx:310:            testID="login_scroll_view"
    mobile-app\app\login.tsx:325:                <View testID="login_form_card" style={[styles.formContainer, compactLayout && styles.compactFormContainer]}>
    mobile-app\app\login.tsx:349:                            testID="login_email_input"
    mobile-app\app\login.tsx:369:                        testID="login_continue_button"
    mobile-app\app\login.tsx:389:                          testID="login_change_email_button"
    mobile-app\app\login.tsx:406:                              testID={`login_pin_slot_${index}`}
    mobile-app\app\login.tsx:423:                          testID="login_pin_input"
    mobile-app\app\login.tsx:443:                      <View testID="login_pin_options_row" style={styles.pinOptionsRow}>
    mobile-app\app\login.tsx:445:                          testID="login_keep_signed_in_checkbox"
    mobile-app\app\login.tsx:460:                          testID="login_forgot_pin_button"
    mobile-app\app\login.tsx:474:                        testID="login_sign_in_button"
    mobile-app\app\login.tsx:484:                            {loading ? <ActivityIndicator testID="login_submit_spinner" color="#FFFFFF" size="small" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
    mobile-app\app\login.tsx:494:                  testID="login_support_button"
    mobile-app\app\login.tsx:516:          Alert.alert('Success', 'Password updated! Please login with your new credentials.');
    mobile-app\app\login.tsx:542:    backgroundColor: loginSurfaceColor,
    mobile-app\app\login.tsx:609:    backgroundColor: loginSurfaceColor,
    mobile-app\app\(tabs)\_layout.tsx:23:  const { attendanceStatus, hasOpenShift, isOnDuty, isShiftStatusReady, isNetworkReachable } = useLocation();
    mobile-app\app\(tabs)\_layout.tsx:36:  if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    mobile-app\app\(tabs)\_layout.tsx:39:        status={attendanceStatus as any}
    mobile-app\components\ShiftControlDrawer.tsx:15:  const { hasOpenShift, isOnDuty, attendanceStatus, isShiftStatusReady } = useLocation();
    mobile-app\components\ShiftControlDrawer.tsx:27:      : attendanceStatus === 'present'
    mobile-app\components\ShiftControlDrawer.tsx:29:        : attendanceStatus === 'absent'
    mobile-app\components\ShiftControlDrawer.tsx:31:          : attendanceStatus === 'on_leave'
    mobile-app\components\ShiftControlCard.tsx:27:    attendanceStatus,
    mobile-app\components\ShiftControlCard.tsx:58:      : attendanceStatus === 'present'
    mobile-app\components\ShiftControlCard.tsx:60:        : attendanceStatus === 'absent'
    mobile-app\components\ShiftControlCard.tsx:62:          : attendanceStatus === 'on_leave'
    mobile-app\components\ShiftControlCard.tsx:113:  const shouldShowDutyAction = isShiftStatusReady && !shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave';
    mobile-app\components\ShiftControlCard.tsx:114:  const shouldShowLateCheckIn = isShiftStatusReady && !shiftHoursLocked && attendanceStatus === 'absent' && isLateCheckInApproved;
    mobile-app\components\ShiftControlCard.tsx:115:  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
    mobile-app\components\ShiftControlCard.tsx:143:        {isShiftStatusReady && attendanceStatus === 'absent' && !isLateCheckInApproved && <Text style={styles.startTimeText}>Your attendance is marked absent. Contact Admin if you need to check in late.</Text>}
    mobile-app\components\ShiftControlCard.tsx:144:        {isShiftStatusReady && shouldShowLateCheckIn && <Text style={styles.startTimeText}>Admin approved your late check-in. Checking in records attendance but does not put you On Duty.</Text>}
    mobile-app\components\ShiftControlCard.tsx:169:              {isBusy ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="login" size={18} color="#FFFFFF" />}
    mobile-app\components\ShiftControlCard.tsx:180:              accessibilityHint={isOnDuty ? 'Pause new delivery requests. Your shift stays open; use End shift to record your end time.' : 'Record attendance and become available for delivery requests.'}
    mobile-app\app\(tabs)\tomorrow.tsx:73:          <ShiftTaskAccessNotice title="Upcoming tasks are locked" message={shiftHoursLocked ? 'Shift hours are closed. Return during your next shift.' : 'Press On Duty to record attendance and reveal your upcoming assignments.'} />
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:260:  login: (email: string, password: string) =&gt; Promise&lt;{ success: boolean, error?: string }&gt;;
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:282:    const inAuthGroup = <span class="cstat-no" title="statement not covered" >segments[0] === 'login';</span>
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:283:<span class="cstat-no" title="statement not covered" >    if (!user &amp;&amp; !inAuthGroup) <span class="cstat-no" title="statement not covered" >router.replace('/login');</span></span>
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:313:  const login = <span class="cstat-no" title="statement not covered" ><span class="fstat-no" title="function not covered" >as</span>ync (email: string, password: string) =&gt; {</span>
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:315:      const res = <span class="cstat-no" title="statement not covered" >await api.post('/api/auth/login', { email, password });</span>
    mobile-app\coverage\lcov-report\mobile-app\context\AuthContext.tsx.html:339:  const value = <span class="cstat-no" title="statement not covered" >useMemo(<span class="fstat-no" title="function not covered" >()</span> =&gt; (<span class="cstat-no" title="statement not covered" >{ user, isLoading, login, logout })</span>, [user, isLoading]);</span>
    mobile-app\app\(tabs)\overdue.tsx:75:          <ShiftTaskAccessNotice title="Overdue tasks are locked" message={shiftHoursLocked ? 'Shift hours are closed. Return during your next shift.' : 'Press On Duty to record attendance and reveal your overdue assignments.'} />
    mobile-app\app\(tabs)\index.tsx:40:  const { isOnDuty, hasOpenShift, attendanceStatus, isShiftStatusReady, isNetworkReachable, shiftHoursLocked } = useLocation();
    mobile-app\app\(tabs)\index.tsx:117:              : attendanceStatus === 'present'
    mobile-app\app\(tabs)\index.tsx:118:                ? 'You have ended today’s shift. Your attendance and recorded hours are saved.'
    mobile-app\app\(tabs)\index.tsx:119:                : attendanceStatus === 'absent' || attendanceStatus === 'on_leave'
    mobile-app\app\(tabs)\index.tsx:120:                  ? 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.'
    mobile-app\app\(tabs)\index.tsx:121:                : 'Press On Duty to record attendance and see your assigned tasks.'}
    mobile-app\app\(tabs)\index.tsx:123:          <ShiftTaskAccessNotice title="Today's tasks are locked" message={shiftHoursLocked ? 'Shift hours are closed. Return during your next shift.' : "Press On Duty to record attendance and reveal today's assigned tasks."} />
    mobile-app\services\apiService.ts:178:  const response = await api.post(`/api/users/${userId}/attendance`, { status, reason, operation_id });
    mobile-app\services\apiService.ts:188:  const res = await api.get('/api/users/me/attendance');
    mobile-app\context\__tests__\avatar.test.tsx:26:  const { user, login, logout, updateAvatar } = useAuth();
    mobile-app\context\__tests__\avatar.test.tsx:29:    <TouchableOpacity testID="login" onPress={() => void login('alex@example.com', '1234', true)} />
    mobile-app\context\__tests__\avatar.test.tsx:49:  await act(async () => fireEvent.press(screen.getByTestId('login')));
    mobile-app\context\__tests__\avatar.test.tsx:63:  await act(async () => fireEvent.press(screen.getByTestId('login')));
    mobile-app\context\__tests__\avatar.test.tsx:71:  await act(async () => fireEvent.press(screen.getByTestId('login')));
    mobile-app\context\AuthContext.tsx:15:  login: (email: string, password: string, keepSignedIn: boolean) => Promise<{
    mobile-app\context\AuthContext.tsx:91:  const login = async (email: string, password: string, keepSignedIn: boolean) => {
    mobile-app\context\AuthContext.tsx:94:      const res = await api.post('/api/auth/login', { email, password });
    mobile-app\context\AuthContext.tsx:155:  const value = useMemo(() => ({ user, token, isLoading, isAuthenticating, login, logout, updateAvatar }), [user, token, isLoading, isAuthenticating]);
    mobile-app\context\LocationContext.tsx:29:const STORAGE_ATTENDANCE_DATE = '@attendance_date';
    mobile-app\context\LocationContext.tsx:30:const STORAGE_ATTENDANCE_STATUS = '@attendance_status';
    mobile-app\context\LocationContext.tsx:50:  attendanceStatus: AttendanceStatus;
    mobile-app\context\LocationContext.tsx:261:  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null);
    mobile-app\context\LocationContext.tsx:307:      if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    mobile-app\context\LocationContext.tsx:308:        Alert.alert('Attendance already submitted', 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.');
    mobile-app\context\LocationContext.tsx:360:      console.error('Failed to end shift:', err);
    mobile-app\context\LocationContext.tsx:370:    if (status === 'present' && attendanceStatus === 'absent' && !isLateCheckInApproved) {
    mobile-app\context\LocationContext.tsx:371:      Alert.alert('Admin approval required', 'Contact Admin to approve a late check-in before starting your shift.');
    mobile-app\context\LocationContext.tsx:401:        catch (storageError) { console.warn('[LocationContext] Duty cache write failed after attendance confirmation:', storageError); }
    mobile-app\context\LocationContext.tsx:408:      const msg = err.response?.data?.error || "Failed to log attendance. Please try again.";
    mobile-app\context\LocationContext.tsx:599:      // attendance or availability as server confirmation.
    mobile-app\context\LocationContext.tsx:784:    activeSocket.on('attendance-updated', async (data: any) => {
    mobile-app\context\LocationContext.tsx:791:        const attendance = await getMyShiftSession().catch(() => null);
    mobile-app\context\LocationContext.tsx:792:        if (attendance) {
    mobile-app\context\LocationContext.tsx:793:          setHasOpenShift(Boolean(attendance.session && !attendance.session.end_time));
    mobile-app\context\LocationContext.tsx:794:          setShiftStartedAt(attendance.session?.start_time ?? null);
    mobile-app\context\LocationContext.tsx:795:          const confirmedDuty = Boolean(attendance.is_on_duty);
    mobile-app\context\LocationContext.tsx:799:        hasConfirmedShiftStatus.current = Boolean(attendance);
    mobile-app\context\LocationContext.tsx:800:        setIsShiftStatusReady(Boolean(attendance));
    mobile-app\context\LocationContext.tsx:1055:      attendanceStatus,
    mobile-app\coverage\lcov-report\mobile-app\app\index.html:97:    <td class="file low" data-value="login.tsx"><a href="login.tsx.html">login.tsx</a></td>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:6:    <title>Code coverage report for mobile-app/app/login.tsx</title>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:22:        <h1><a href="../../index.html">All files</a> / <a href="index.html">mobile-app/app</a> login.tsx</h1>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1306:  const { login } = <span class="cstat-no" title="statement not covered" >useAuth();</span>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1370:    const result: any = <span class="cstat-no" title="statement not covered" >await login(email, finalPassword);</span>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1397:  // Auto-login when 4th digit is entered
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1440:<span class="cstat-no" title="statement not covered" >      Alert.alert('Success', 'Password updated! Please login with your new credentials.');</span>
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1492:                        testID="login_email_input"
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1507:                    testID="login_continue_button"
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1519:                  &lt;TouchableOpacity testID="login_back_button" style={styles.backButton} onPress={handleBack}&gt;
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1543:                        testID={`login_pin_key_${num}`}
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1551:                    &lt;TouchableOpacity testID="login_pin_clear" style={styles.numberButton} onPress={<span class="fstat-no" title="function not covered" >()</span> =&gt; <span class="cstat-no" title="statement not covered" >setPassword('')}</span> activeOpacity={0.6}&gt;
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1554:                    &lt;TouchableOpacity testID="login_pin_key_0" style={styles.numberButton} onPress={<span class="fstat-no" title="function not covered" >()</span> =&gt; <span class="cstat-no" title="statement not covered" >handleNumberPress('0')}</span> activeOpacity={0.6}&gt;
    mobile-app\coverage\lcov-report\mobile-app\app\login.tsx.html:1557:                    &lt;TouchableOpacity testID="login_pin_delete" style={styles.numberButton} onPress={handleDelete} activeOpacity={0.6}&gt;
    mobile-app\coverage\lcov-report\mobile-app\app\_layout.tsx.html:287:      &lt;Stack.Screen name="login" /&gt;
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:317:<span class="cstat-no" title="statement not covered" >              console.warn('📱 Push registration: Waiting for fresh login session...');</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\data\useDashboard.ts.html:349:<span class="cstat-no" title="statement not covered" >          router.replace('/login');</span>
    ✓ • 176ms

## Activity

    $ $files = @('server/routes/auth.ts','server/routes/users.ts','server/services/shiftSessions.ts','mobile-app/context/AuthContext.tsx','mobile-app/context/LocationContext.tsx','mobile-app/components/ShiftControlCard.tsx','src/app/context/AuthContext.tsx','src/app/pages/Admin/AttendanceDashboard.tsx'); foreach ($f in $files) { Write-Output "FILE: $f"; if (Test-Path $f) { rg -n "router\.|login|startShift|endShift|toggleDuty|submitAttendance|late|shift|attendance|is_on_duty|is_online|socket|approve" $f } else { Write-Output 'MISSING' } }
    FILE: server/routes/auth.ts
    4:import { loginSchema, signupSchema } from '../schemas/authSchema';
    34:  await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [user.id]);
    35:  user.is_on_duty = false;
    36:  req.app.get('io')?.to('admin-room').emit('rider-status-updated', { riderId: user.id, riderName: user.name, type: 'duty', is_on_duty: false });
    52:    is_on_duty: user.is_on_duty,
    81:router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    129:        challenge: await issueAuthChallenge(user.id, 'mfa_login'),
    140:    // A fresh rider login starts connected but off duty.
    160:router.post('/refresh', async (req: Request, res: Response) => {
    200:router.post('/logout', async (req: Request, res: Response) => {
    247:// Start MFA enrollment after the password was verified by /login.
    248:router.post('/mfa/setup-init', async (req: Request, res: Response) => {
    279:router.post('/mfa/setup-verify', async (req: Request, res: Response) => {
    332:// Complete MFA login using the challenge issued after password verification.
    333:router.post('/mfa/verify-login', async (req: Request, res: Response) => {
    335:    const { challenge: loginChallenge, token, rememberMe: requestedRememberMe = false } = req.body || {};
    337:    if (!loginChallenge || !token) return res.status(401).json({ error: 'Authentication challenge required' });
    339:    const pendingLogin = await findAuthChallenge(loginChallenge, 'mfa_login');
    340:    if (!pendingLogin) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    343:    if (users.length === 0) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    347:      return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    358:      if (!await consumeAuthChallenge(loginChallenge, 'mfa_login')) {
    359:        return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    378:router.post('/signup', validate(signupSchema), async (req, res) => {
    400:router.post('/update-password', async (req: Request, res: Response) => {
    FILE: server/routes/users.ts
    11:import { approveLateCheckIn, endShiftSession, getCurrentShiftSession, getShiftSessionsForDate, setNonPresentAttendance, setRiderAvailability, ShiftSessionError, startShiftSession } from '../services/shiftSessions';
    32:router.get('/', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    46:router.post('/:id/reset-mfa', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    58:router.patch('/me/avatar', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    75:router.get('/riders', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
    86:router.get('/riders/live', authorize(['admin', 'personnel']), async (req: AuthRequest, res: Response) => {
    89:    // Fetch all riders and their latest info, ensuring unique riders via GROUP BY
    93:             u.is_on_duty, u.last_battery_level, u.last_signal_strength,
    99:             (SELECT status FROM attendance_logs WHERE rider_id = u.id AND date = ${PH_TODAY_SQL} LIMIT 1) as attendance_status
    103:        AND dr.delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
    106:               u.is_on_duty, u.last_battery_level, u.last_signal_strength, rap.avatar_id
    112:      is_online: onlineRiders.has(r.id),
    123:// GET /attendance/daily (Admin only)
    124:router.get('/attendance/daily', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    128:      SELECT u.id as rider_id, u.name as rider_name, u.email as rider_email, u.is_on_duty,
    130:             al.absence_source, al.auto_absent_at, al.late_checkin_approved_by,
    131:             al.late_checkin_approved_at, late_approver.name AS late_checkin_approved_by_name,
    135:                AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')) as active_task_count,
    148:      LEFT JOIN attendance_logs al ON u.id = al.rider_id AND al.date = ?
    149:      LEFT JOIN users late_approver ON late_approver.id = al.late_checkin_approved_by
    155:      return { ...row, is_on_duty: Boolean(row.is_on_duty), sessions: summary.sessions, total_worked_minutes: summary.total_worked_minutes };
    159:    console.error('Fetch attendance error:', error);
    160:    res.status(500).json({ error: 'Failed to fetch attendance' });
    164:// GET /me/attendance (Rider only)
    165:router.get('/me/shift-session', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    169:    const [users]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [req.user!.id]);
    170:    const [ended]: any = await pool.query("SELECT end_source, end_time FROM shift_sessions WHERE rider_id=? AND session_state='closed' ORDER BY end_time DESC LIMIT 1", [req.user!.id]);
    171:    res.json({ session, is_on_duty: Boolean(users[0]?.is_on_duty) && !access.locked,
    176:    res.status(500).json({ error: 'Failed to fetch current shift' });
    180:router.post('/attendance/:riderId/late-check-in-approval', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    185:    const approval = await approveLateCheckIn(pool, { riderId, date, adminId: String(req.user!.id) });
    188:      riderId, type: 'attendance', status: 'absent', absence_source: 'automatic_no_show',
    189:      late_checkin_approved: true, date,
    192:      id: `notif_late_checkin_${riderId}_${date}`,
    193:      message: `Late check-in approved for rider ${riderId}.`,
    196:    io?.to(riderId).emit('attendance-updated', { status: 'absent', late_checkin_approved: true, date });
    207:router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    210:      `SELECT status, reason, absence_source, auto_absent_at, late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`,
    215:    res.status(500).json({ error: 'Failed to fetch personal attendance' });
    219:// POST /:id/attendance (Rider only - Morning Check-in)
    220:router.post('/:id/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    229:      return res.status(400).json({ error: 'Invalid attendance status' });
    234:      if (access.locked) return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Outside rider shift hours.', next_start_at: access.policy.nextStartAt });
    236:      const session = await startShiftSession(pool, { riderId: id, operationId: operation_id.trim() });
    237:      const [riders]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [id]);
    238:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    239:      io.to(id).emit('attendance-updated', { status });
    240:      return res.json({ success: true, session, is_on_duty: Boolean(riders[0]?.is_on_duty) });
    246:      ? `Rider ${user.name} has checked in for shift.`
    256:    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    259:    io.to(id).emit('attendance-updated', { status });
    271:router.post('/:id/duty', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    273:  const { is_on_duty } = req.body;
    277:  if (typeof is_on_duty !== 'boolean') return res.status(400).json({ error: 'Duty status must be true or false' });
    279:    if (is_on_duty) {
    281:      if (access.locked) return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Outside rider shift hours.', next_start_at: access.policy.nextStartAt });
    283:    const result = await setRiderAvailability(pool, { riderId: id, isOnDuty: is_on_duty });
    284:    io.to('admin-room').emit('rider-status-updated', { riderId: id, riderName: user.name, type: 'duty', is_on_duty });
    285:    if (is_on_duty) {
    286:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status: 'present' });
    287:      io.to(id).emit('attendance-updated', { status: 'present' });
    290:      await recordConnectivityLog({ riderId: String(id), riderName: user.name, eventType: is_on_duty ? 'duty_on' : 'duty_off', isOnDuty: is_on_duty });
    303:router.post('/dev/simulate-reset', async (req: AuthRequest, res: Response) => {
    309:    console.log('ðŸš€ DEV: Resetting today\'s attendance logs...');
    310:    await pool.query(`DELETE FROM attendance_logs WHERE date = ${PH_TODAY_SQL}`);
    318:router.post('/dev/simulate-sweep', async (req: AuthRequest, res: Response) => {
    330:      WHERE u.role = 'rider' AND u.is_on_duty = TRUE
    334:        AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')
    340:        await endShiftSession(pool, { riderId: rider.id, operationId: `auto_off_${crypto.randomUUID()}`, reason: 'Automatically ended by the system (simulation).' });
    341:        io.to(rider.id).emit('dev-simulate', {
    343:          message: 'Your shift has been automatically ended by the system (Simulation).'
    346:        console.error(`[SimSweep] Failed to close shift for ${rider.id}:`, sweepError);
    356:// DELETE /attendance/:riderId (Admin only) - Clear absence for today
    357:router.delete('/attendance/:riderId', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    362:    const [rows]: any = await pool.query(`SELECT absence_source FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`, [riderId]);
    364:      return res.status(409).json({ error: 'Use Approve late check-in to authorize a rider with an automatic no-show.' });
    366:    await pool.query(`DELETE FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL}`, [riderId]);
    369:    io.to(riderId).emit('attendance-cleared', { message: 'Your absence has been cleared by Admin. You can now start your shift.' });
    370:    io.to(riderId).emit('attendance-updated', { status: null });
    375:      message: `Rider attendance cleared for ${riderId}`,
    381:    res.status(500).json({ error: 'Failed to clear attendance' });
    386:router.patch('/:id', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    404:router.post('/location', async (req: AuthRequest, res: Response) => {
    447:router.post('/location/batch', async (req: AuthRequest, res: Response) => {
    527:router.post('/:id/shift/end', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    537:    if (access.closed) return res.json({ success: true, session: access.closed, is_on_duty: false });
    539:      const [recent]: any = await pool.query("SELECT * FROM shift_sessions WHERE rider_id=? AND end_source='scheduled' AND DATE(start_time)=? ORDER BY end_time DESC LIMIT 1", [id, access.policy.date]);
    540:      if (recent[0]) return res.json({ success: true, session: recent[0], is_on_duty: false });
    543:    const session = await endShiftSession(pool, { riderId: id, operationId: operation_id.trim(), reason });
    544:    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'shift', is_on_duty: false });
    545:    io.to('admin-room').emit('rider-status-updated', { riderId: id, riderName: user.name, type: 'duty', is_on_duty: false });
    549:        message: `Rider ${user.name} ended a shift with ${session.active_task_count_at_end} unfinished task(s). Reason: ${session.handover_reason}`,
    555:    } catch (logError) { console.error('Failed to log shift end connectivity:', logError); }
    556:    return res.json({ success: true, session, is_on_duty: false });
    568:router.post('/', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    584:router.post('/:id/reset-password', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    597:router.delete('/:id', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    FILE: server/services/shiftSessions.ts
    2:import { getPhilippineDateTime } from './shiftSchedule';
    16:const activeTaskSql = `SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ? AND delivery_status NOT IN ('completed','failed','cancelled','disapproved') AND (delivery_date <= ${TODAY} OR delivery_status = 'in_progress')`;
    18:export async function startShiftSession(db: Db, input: { riderId: string; operationId: string }) {
    20:    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='start' LIMIT 1`, [input.riderId, input.operationId]);
    22:    const [opened] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    27:    const [attendanceRows] = await conn.query(`SELECT id, status, absence_source,
    28:      late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs
    30:    const attendance = attendanceRows[0];
    31:    if (attendance && attendance.status !== 'present') {
    32:      const approvedAutoAbsence = attendance.status === 'absent'
    33:        && attendance.absence_source === 'automatic_no_show'
    34:        && attendance.late_checkin_approved_by
    35:        && attendance.late_checkin_approved_at;
    36:      if (!approvedAutoAbsence) {
    39:      await conn.query(`UPDATE attendance_logs SET status='present', check_in_time=${NOW} WHERE id=?`, [attendance.id]);
    41:    const id = `shift_${crypto.randomUUID()}`;
    42:    if (!attendance) {
    43:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW})`, [`att_${crypto.randomUUID()}`, input.riderId]);
    45:    // Starting attendance opens a shift; going online is a separate rider action.
    46:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    47:    await conn.query(`INSERT INTO shift_sessions (id,rider_id,start_time,session_state,start_operation_id) VALUES (?, ?, ${NOW}, 'open', ?)`, [id, input.riderId, input.operationId]);
    49:    const [created] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [id]);
    56:    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    59:      const [attendance] = await conn.query(`SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ${TODAY} LIMIT 1`, [input.riderId]);
    60:      if (attendance[0] && attendance[0].status !== 'present') {
    63:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW}) ON DUPLICATE KEY UPDATE check_in_time=IF(status='present',check_in_time,${NOW}), status='present'`, [`att_${crypto.randomUUID()}`, input.riderId]);
    65:        const shiftId = `shift_${crypto.randomUUID()}`;
    67:        await conn.query(`INSERT INTO shift_sessions (id,rider_id,start_time,session_state,start_operation_id) VALUES (?, ?, ${NOW}, 'open', ?)`, [shiftId, input.riderId, operationId]);
    68:        const [created] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [shiftId]);
    73:    await conn.query('UPDATE users SET is_on_duty = ? WHERE id = ?', [input.isOnDuty, input.riderId]);
    78:    return { session, is_on_duty: input.isOnDuty };
    82:export async function endShiftSession(db: Db, input: { riderId: string; operationId: string; reason?: string }) {
    84:    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='end' LIMIT 1`, [input.riderId, input.operationId]);
    86:    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1 FOR UPDATE", [input.riderId]);
    87:    if (!open[0]) throw new ShiftSessionError('NO_OPEN_SHIFT', 'There is no open shift to end.');
    91:    await conn.query(`UPDATE shift_sessions SET end_time=${NOW}, session_state='closed', end_operation_id=?, handover_reason=?, active_task_count_at_end=? WHERE id=?`, [input.operationId, reason || null, tasks.length, open[0].id]);
    92:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    93:    await conn.query(`UPDATE attendance_logs SET off_duty_time=${NOW} WHERE rider_id=? AND date=DATE(?)`, [input.riderId, open[0].start_time]);
    97:    const [closed] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [open[0].id]);
    104:    const [open] = await conn.query("SELECT id FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' LIMIT 1 FOR UPDATE", [input.riderId]);
    105:    if (open[0]) throw new ShiftSessionError('OPEN_SHIFT', 'End your current shift before changing attendance status.');
    107:    await conn.query(`INSERT INTO attendance_logs (id, rider_id, date, status, reason, check_in_time)
    111:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    116:export async function approveLateCheckIn(
    125:    const [rows] = await conn.query(`SELECT status, absence_source, late_checkin_approved_at
    126:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1 FOR UPDATE`, [input.riderId, input.date]);
    127:    const attendance = rows[0];
    128:    if (attendance?.status !== 'absent' || attendance.absence_source !== 'automatic_no_show' || attendance.late_checkin_approved_at) {
    129:      throw new ShiftSessionError('LATE_CHECKIN_NOT_ELIGIBLE', 'Only an unapproved automatic no-show can be approved for late check-in.');
    131:    await conn.query(`UPDATE attendance_logs SET late_checkin_approved_by=?, late_checkin_approved_at=${NOW}
    132:      WHERE rider_id=? AND date=? AND status='absent' AND absence_source='automatic_no_show' AND late_checkin_approved_at IS NULL`,
    134:    const [updated] = await conn.query(`SELECT late_checkin_approved_by, late_checkin_approved_at
    135:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1`, [input.riderId, input.date]);
    141:  await conn.query('INSERT INTO shift_operation_receipts (id,rider_id,operation_id,operation_kind,session_id) VALUES (?,?,?,?,?)', [`shift_op_${crypto.randomUUID()}`, riderId, operationId, kind, sessionId]);
    160:  const [rows] = await db.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [riderId]);
    165:  const [rows] = await db.query(`SELECT *, CASE WHEN session_state = 'closed' AND end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,start_time,end_time) ELSE NULL END AS duration_minutes FROM shift_sessions WHERE rider_id=? AND DATE(start_time)=? ORDER BY start_time ASC`, [riderId, date]);
    FILE: mobile-app/context/AuthContext.tsx
    15:  login: (email: string, password: string, keepSignedIn: boolean) => Promise<{
    51:    if (redirect) router.replace(redirect);
    91:  const login = async (email: string, password: string, keepSignedIn: boolean) => {
    94:      const res = await api.post('/api/auth/login', { email, password });
    137:    await AsyncStorage.setItem('@is_on_duty', 'false');
    155:  const value = useMemo(() => ({ user, token, isLoading, isAuthenticating, login, logout, updateAvatar }), [user, token, isLoading, isAuthenticating]);
    FILE: mobile-app/context/LocationContext.tsx
    4:import { io } from 'socket.io-client';
    14:import { updateDutyStatus, submitAttendance, endShift as endShiftRequest, getMyAttendance, getMyShiftSession, getJobQueryKey } from '@/services/apiService';
    15:import { applyCommittedDutyResult, getOrCreateShiftOperationId } from '@/services/shiftOperationService';
    23:import { isOutsideShiftHours, RiderShiftSchedule } from '@/utils/shiftHours';
    28:const STORAGE_DUTY_STATUS = '@is_on_duty';
    29:const STORAGE_ATTENDANCE_DATE = '@attendance_date';
    30:const STORAGE_ATTENDANCE_STATUS = '@attendance_status';
    49:  shiftStartedAt: string | null;
    50:  attendanceStatus: AttendanceStatus;
    53:  shiftHoursLocked: boolean;
    54:  shiftSchedule: RiderShiftSchedule | null;
    65:  toggleDuty: (status: boolean) => Promise<DutyToggleResult>;
    66:  endShift: (reason?: string) => Promise<DutyToggleResult>;
    70:  simulateLocation: (lat: number, lng: number, heading?: number | null, overrideRiderId?: string) => void;
    260:  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
    261:  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(null);
    269:  const [shiftClock, setShiftClock] = useState(Date.now());
    270:  const shiftHoursLocked = !hasConfirmedSchedule || serverShiftLocked || Boolean(confirmedSchedule && isOutsideShiftHours(confirmedSchedule, new Date(shiftClock)));
    273:    if (shiftHoursLocked && isOnDuty) {
    275:      void stopBackgroundTracking('shift hours cutoff');
    277:  }, [shiftHoursLocked, isOnDuty]);
    286:  const socketRef = useRef<ReturnType<typeof io> | null>(null);
    289:  const socketAuthRefreshInFlight = useRef(false);
    299:  const toggleDuty = async (status: boolean): Promise<DutyToggleResult> => {
    301:    if (status && shiftHoursLocked) {
    302:      Alert.alert('Shift hours locked', 'You can go On Duty during the next scheduled shift.');
    307:      if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    308:        Alert.alert('Attendance already submitted', 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.');
    315:      const confirmedDuty = Boolean(response.data?.is_on_duty);
    350:  const endShift = async (reason?: string): Promise<DutyToggleResult> => {
    354:      const response = await endShiftRequest(user.id, operationId, reason);
    357:      await applyCommittedDutyResult('end', Boolean(response.data?.is_on_duty), setIsOnDuty);
    360:      console.error('Failed to end shift:', err);
    362:      const msg = err.response?.data?.error || 'Could not end your shift. Please try again.';
    370:    if (status === 'present' && attendanceStatus === 'absent' && !isLateCheckInApproved) {
    371:      Alert.alert('Admin approval required', 'Contact Admin to approve a late check-in before starting your shift.');
    374:    if (status === 'present' && shiftHoursLocked) {
    375:      Alert.alert('Shift hours locked', 'You can start your shift during the next scheduled hours.');
    381:      const response = await submitAttendance(user.id, status, reason, operationId);
    393:        const confirmedDuty = Boolean(response.data?.is_on_duty);
    401:        catch (storageError) { console.warn('[LocationContext] Duty cache write failed after attendance confirmation:', storageError); }
    408:      const msg = err.response?.data?.error || "Failed to log attendance. Please try again.";
    416:    if (!socketRef.current?.connected || !user?.id || !isOnDuty) return;
    424:    socketRef.current?.emit('update-location', {
    568:      const shiftData = await getMyShiftSession();
    569:      const confirmedDuty = Boolean(shiftData.is_on_duty);
    570:      setConfirmedSchedule(shiftData.schedule ? { date: shiftData.schedule.date, start_time: shiftData.schedule.start_time, end_time: shiftData.schedule.end_time } : null);
    573:        const key = `@shift_schedule_${user.id}`;
    574:        if (shiftData.schedule) await AsyncStorage.setItem(key, JSON.stringify(shiftData.schedule));
    577:      setServerShiftLocked(Boolean(shiftData.locked));
    578:      setNextShiftStartAt(shiftData.next_start_at ?? null);
    579:      setLastEndSource(shiftData.last_end_source ?? null);
    581:      setHasOpenShift(Boolean(shiftData.session && !shiftData.session.end_time));
    582:      setShiftStartedAt(shiftData.session?.start_time ?? null);
    587:        setIsLateCheckInApproved(serverData.status === 'absent' && Boolean(serverData.late_checkin_approved_at));
    599:      // attendance or availability as server confirmation.
    602:          const cached = await AsyncStorage.getItem(`@shift_schedule_${user.id}`);
    610:        } catch { /* Keep shift access locked when cached schedule is unavailable. */ }
    618:    if (isOutsideShiftHours(confirmedSchedule, new Date(shiftClock))) return;
    619:    if (shiftClock - lastShiftUnlockCheck.current < 60_000) return;
    620:    lastShiftUnlockCheck.current = shiftClock;
    622:  }, [confirmedSchedule, isNetworkReachable, serverShiftLocked, shiftClock, syncStatus, user?.id]);
    673:  const simulateLocation = (lat: number, lng: number, heading?: number | null, overrideRiderId?: string) => {
    681:    // Emit to system via socket so Admin/Personnel see it
    682:    if (socketRef.current?.connected) {
    683:      socketRef.current.emit('update-location', {
    703:      if (socketRef.current) {
    704:        socketRef.current.disconnect();
    705:        socketRef.current = null;
    707:      // This reset mirrors the external socket lifecycle when authentication disappears.
    714:      if (socketAuthRefreshInFlight.current) return;
    716:      socketAuthRefreshInFlight.current = true;
    720:        if (!freshToken || !socketRef.current) {
    724:        socketRef.current.auth = { token: freshToken };
    725:        if (!socketRef.current.connected) {
    726:          socketRef.current.connect();
    731:        socketAuthRefreshInFlight.current = false;
    735:    let socket: ReturnType<typeof io> | null = null;
    736:    let socketSetupCancelled = false;
    740:      if (socketSetupCancelled || !freshToken) return;
    742:      socketRef.current = io(Config.API_URL, {
    743:        transports: ['polling', 'websocket'],
    748:      socket = socketRef.current;
    749:      if (!socket) return;
    750:      const activeSocket = socket;
    758:        const terminalStatuses = ['cancelled', 'completed', 'failed', 'disapproved'];
    784:    activeSocket.on('attendance-updated', async (data: any) => {
    786:      if (typeof data.late_checkin_approved === 'boolean') setIsLateCheckInApproved(data.late_checkin_approved);
    789:        // Attendance presence is not itself a shift session. The duty state is
    790:        // sourced from the shift-session endpoint and updated by checkIn().
    791:        const attendance = await getMyShiftSession().catch(() => null);
    792:        if (attendance) {
    793:          setHasOpenShift(Boolean(attendance.session && !attendance.session.end_time));
    794:          setShiftStartedAt(attendance.session?.start_time ?? null);
    795:          const confirmedDuty = Boolean(attendance.is_on_duty);
    799:        hasConfirmedShiftStatus.current = Boolean(attendance);
    800:        setIsShiftStatusReady(Boolean(attendance));
    902:      socketSetupCancelled = true;
    1020:  // be stale and briefly show ONLINE while the current shift is actually closed.
    1026:    const socket = socketRef.current;
    1027:    if (socket) {
    1028:      socket.on('dev-simulate', (data: any) => {
    1036:        socket.off('dev-simulate');
    1042:    const socket = socketRef.current;
    1043:    if (!socket) return () => undefined;
    1044:    socket.on(event, listener);
    1045:    return () => socket.off(event, listener);
    1054:      shiftStartedAt,
    1055:      attendanceStatus,
    1058:      shiftHoursLocked,
    1059:      shiftSchedule: confirmedSchedule,
    1070:      toggleDuty,
    1071:      endShift,
    1075:      simulateLocation,
    FILE: mobile-app/components/ShiftControlCard.tsx
    11:import { getPhilippineClock } from '@/utils/shiftHours';
    27:    attendanceStatus,
    29:    endShift,
    34:    shiftStartedAt,
    35:    shiftHoursLocked,
    36:    shiftSchedule,
    39:    toggleDuty,
    51:  const startTime = formatShiftStartTime(shiftStartedAt);
    54:    : shiftHoursLocked
    58:      : attendanceStatus === 'present'
    60:        : attendanceStatus === 'absent'
    62:          : attendanceStatus === 'on_leave'
    69:      await toggleDuty(!isOnDuty);
    87:      const result = await endShift();
    102:      return (await endShift(reason)) === 'success';
    109:  const minutesUntilEnd = shiftSchedule && clock.date === shiftSchedule.date
    110:    ? Number(shiftSchedule.end_time.slice(0, 2)) * 60 + Number(shiftSchedule.end_time.slice(3))
    113:  const shouldShowDutyAction = isShiftStatusReady && !shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave';
    114:  const shouldShowLateCheckIn = isShiftStatusReady && !shiftHoursLocked && attendanceStatus === 'absent' && isLateCheckInApproved;
    115:  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
    116:  const shouldShowShiftControls = isShiftStatusReady && hasOpenShift && !shiftHoursLocked;
    120:      <View testID="shift-control-card" style={styles.card}>
    138:        {isShiftStatusReady && shiftHoursLocked && <View style={styles.startTimeRow}>
    140:          <Text style={styles.startTimeText}>{lastEndSource === 'scheduled' ? 'Shift ended automatically. ' : 'Shift hours are closed. '}{nextShiftStartAt ? `Next start: ${nextShiftStartAt.replace(' ', ' at ')}` : 'Check back for your next shift.'}</Text>
    142:        {isShiftStatusReady && hasOpenShift && !shiftHoursLocked && minutesUntilEnd !== null && minutesUntilEnd > 0 && minutesUntilEnd <= 30 && <Text style={styles.startTimeText}>Your shift ends automatically in {minutesUntilEnd} minute{minutesUntilEnd === 1 ? '' : 's'}.</Text>}
    143:        {isShiftStatusReady && attendanceStatus === 'absent' && !isLateCheckInApproved && <Text style={styles.startTimeText}>Your attendance is marked absent. Contact Admin if you need to check in late.</Text>}
    144:        {isShiftStatusReady && shouldShowLateCheckIn && <Text style={styles.startTimeText}>Admin approved your late check-in. Checking in records attendance but does not put you On Duty.</Text>}
    163:              accessibilityLabel="Check in late"
    164:              accessibilityHint="Record your actual late check-in. This does not place you On Duty."
    169:              {isBusy ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="login" size={18} color="#FFFFFF" />}
    170:              <Text style={styles.onDutyButtonText}>{isBusy ? 'Checking in…' : 'Check in — late'}</Text>
    180:              accessibilityHint={isOnDuty ? 'Pause new delivery requests. Your shift stays open; use End shift to record your end time.' : 'Record attendance and become available for delivery requests.'}
    191:              accessibilityLabel="End shift"
    192:              accessibilityHint="Close your work shift and record your end time."
    196:              style={({ pressed }) => [styles.endShiftButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
    199:              <Text style={styles.endShiftButtonText}>End shift</Text>
    203:        {shouldShowShiftControls && isOnDuty && <Text style={styles.startTimeText}>Pausing availability keeps your shift open. Use End shift to record your end time.</Text>}
    355:  endShiftButton: {
    370:  endShiftButtonText: {
    FILE: src/app/context/AuthContext.tsx
    8:  login: (email: string, password: string, rememberMe?: boolean) => Promise<{
    71:  const login: AuthContextType['login'] = async (email, password, rememberMe = false) => {
    73:      const response = await fetch(`${API_URL}/auth/login`, {
    175:        login,
    FILE: src/app/pages/Admin/AttendanceDashboard.tsx
    56:  is_on_duty: boolean;
    62:  late_checkin_approved_by?: string | null;
    63:  late_checkin_approved_by_name?: string | null;
    64:  late_checkin_approved_at?: string | null;
    75:  const { socket } = useRealTime();
    77:  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    79:  const [attendanceError, setAttendanceError] = useState<string | null>(null);
    81:  const attendanceRequestId = useRef(0);
    92:  const calculateDuration = (start: string | null, end: string | null | undefined) => {
    110:    const requestId = ++attendanceRequestId.current;
    113:      const res = await fetch(`/api/users/attendance/daily?date=${selectedDate}`, {
    119:      if (requestId !== attendanceRequestId.current) return;
    123:      if (requestId !== attendanceRequestId.current) return;
    124:      const message = error instanceof Error ? error.message : 'Unable to reach attendance service';
    126:      if (!silent) toast.error(`Failed to load attendance records: ${message}`);
    129:      if (requestId === attendanceRequestId.current && !silent) setLoading(false);
    155:    if (!socket) return;
    157:    const handleInstantUpdate = (event?: { type?: string; riderName?: string; is_on_duty?: boolean }) => {
    159:      if (event?.type === 'duty' && typeof event.is_on_duty === 'boolean') {
    161:        toast.info(`${riderName} is now ${event.is_on_duty ? 'On duty' : 'Off duty'}`);
    166:    socket.on('rider-status-updated', handleInstantUpdate);
    167:    socket.on('notification-added', handleInstantUpdate);
    170:      socket.off('rider-status-updated', handleInstantUpdate);
    171:      socket.off('notification-added', handleInstantUpdate);
    173:  }, [socket, fetchAttendance]);
    176:    total: attendance.length,
    177:    present: attendance.filter(a => a.status === 'present').length,
    178:    absent: attendance.filter(a => a.status === 'absent').length,
    179:    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    180:    noReport: attendance.filter(a => !a.status).length,
    183:  const filteredAttendance = attendance.filter(a =>
    190:    return startTime ? formatPhilippineTime(startTime) : 'No shift recorded';
    200:    return 'No shift recorded';
    204:    if (!window.confirm("Are you sure you want to clear this absence? The rider will be able to start their shift again.")) return;
    207:      const res = await fetch(`/api/users/attendance/${riderId}`, {
    221:  const approveLateCheckIn = async (record: AttendanceRecord) => {
    224:      const response = await fetch(`/api/users/attendance/${record.rider_id}/late-check-in-approval`, {
    231:      if (!response.ok) throw new Error(data?.error || 'Unable to approve late check-in');
    232:      toast.success(`Late check-in approved for ${record.rider_name}`);
    235:      toast.error(error instanceof Error ? error.message : 'Failed to approve late check-in');
    252:            {record.absence_source === 'automatic_no_show' && record.late_checkin_approved_at && (
    254:                Approved by {record.late_checkin_approved_by_name || record.late_checkin_approved_by || 'Admin'} at {formatPhilippineTime(record.late_checkin_approved_at)}
    266:              record.late_checkin_approved_at ? (
    268:                  Late check-in approved by {record.late_checkin_approved_by_name || record.late_checkin_approved_by || 'Admin'} at {formatPhilippineTime(record.late_checkin_approved_at)}
    275:                  onClick={() => void approveLateCheckIn(record)}
    278:                  {approvalInProgress === record.rider_id ? 'Approving…' : 'Approve late check-in'}
    286:                className="h-6 rounded-md bg-slate-900 px-2 text-[7px] font-black uppercase tracking-widest text-white hover:bg-black"
    301:              className="h-6 rounded-md bg-slate-900 px-2 text-[7px] font-black uppercase tracking-widest text-white hover:bg-black"
    308:        return <Badge className="bg-slate-50 text-slate-400 border-slate-100 font-black text-[9px] px-2 py-0.5">NO REPORT</Badge>;
    315:      isOnDuty ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
    322:    <div className="flex flex-col h-full min-h-0 bg-slate-50/50">
    324:      <div className="bg-white border-b border-slate-100 px-4 py-3 sm:px-8 sm:py-6">
    327:            <h1 className="text-lg md:text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
    333:            <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wide md:tracking-widest mt-1 ml-9 md:ml-11">
    334:              Daily shift records & absence management
    340:               <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
    349:                className="h-11 pl-10 pr-3 md:pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
    356:              className="rounded-xl border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
    363:        {attendanceError && (
    365:            <span>Could not load attendance for {selectedDate}: {attendanceError}</span>
    373:            { label: 'TOTAL RIDERS', mobileLabel: 'Riders', value: stats.total, icon: User, color: 'text-slate-600', bg: 'bg-slate-50' },
    377:            { label: 'PENDING', mobileLabel: 'Pending', value: stats.noReport, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-100/50' },
    381:              data-attendance-stat
    383:                "col-span-1 min-w-0 rounded-xl border border-slate-100 shadow-sm md:rounded-2xl",
    393:                <p className="text-sm font-[900] leading-none tracking-tighter text-slate-900 md:text-2xl">{stat.value}</p>
    402:        <Card role="region" aria-label="Attendance records" className="flex-1 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-300/50 flex flex-col overflow-hidden">
    404:          <div className="p-3 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    406:              <h2 className="text-sm sm:text-base font-black text-slate-900">Attendance records</h2>
    408:                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tabular-nums text-slate-600">{filteredAttendance.length}</span>
    414:                  aria-label={mobileSearchOpen ? 'Close attendance search' : 'Search attendance records'}
    416:                  aria-controls="mobile-attendance-search"
    419:                  className="h-11 w-11 shrink-0 rounded-xl border-slate-200 text-slate-600 md:hidden"
    426:               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
    431:                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
    436:                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
    439:                  id="mobile-attendance-search"
    440:                  aria-label="Search attendance records"
    450:                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
    460:                <div key={item} className="h-36 rounded-2xl bg-slate-50 animate-pulse" />
    462:            ) : attendanceError ? (
    469:                <ClipboardCheck className="h-10 w-10 text-slate-100 mx-auto mb-3" />
    470:                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
    483:                      "rounded-2xl border-slate-100 p-3 shadow-sm",
    491:                          hasConflict ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
    496:                          <p className="flex items-center gap-1.5 truncate text-xs font-black text-slate-900">
    500:                          <p className="truncate text-[9px] font-bold text-slate-400">{record.rider_email}</p>
    506:                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2.5">
    508:                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duty status</p>
    509:                        <div className="mt-1">{getDutyBadge(record.is_on_duty)}</div>
    512:                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Shift start</p>
    513:                        <p className="mt-1 text-[10px] font-bold text-slate-700">{formatShiftStart(record)}</p>
    516:                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Shift end</p>
    517:                        <p className="mt-1 text-[10px] font-bold text-slate-700">{formatShiftEnd(record)}</p>
    520:                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duration</p>
    521:                        <p className="mt-1 text-[10px] font-black tabular-nums text-slate-700">{record.sessions?.length ? `${Math.floor((record.total_worked_minutes || 0) / 60)}h ${(record.total_worked_minutes || 0) % 60}m` : (calculateDuration(record.check_in_time, record.off_duty_time) || '--')}</p>
    524:                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Integrity</p>
    533:                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
    534:                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wide text-slate-500">
    539:                          <div key={session.id} className="rounded-lg bg-slate-50 px-2 py-1 text-[9px] text-slate-600">
    550:                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Active tasks</span>
    555:                            : "bg-slate-100 text-slate-400"
    570:                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
    571:                        {record.reason && <p className="text-[9px] font-medium italic text-slate-500"><span className="font-black not-italic text-slate-400">MORNING:</span> {record.reason}</p>}
    585:                <tr className="border-b border-slate-50">
    586:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider Information</th>
    587:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
    588:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty status</th>
    589:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Discipline</th>
    590:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Start</th>
    591:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift End</th>
    592:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
    593:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Tasks</th>
    594:                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Reason</th>
    597:              <tbody className="divide-y divide-slate-50">
    598:                {attendanceError ? (
    608:                       <ClipboardCheck className="h-12 w-12 text-slate-100 mx-auto mb-4" />
    609:                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
    627:                          "hover:bg-slate-50/50 transition-colors group",
    634:                              "w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 font-black text-xs shadow-sm",
    635:                              hasConflict ? "bg-rose-100 text-rose-600" : "bg-slate-100"
    640:                              <p className="text-sm font-black text-slate-900 leading-none flex items-center gap-2">
    644:                              <p className="text-[10px] font-bold text-slate-400 mt-1">{record.rider_email}</p>
    652:                          {getDutyBadge(record.is_on_duty)}
    667:                          <div className="flex items-center gap-2 text-slate-600">
    668:                            <Clock size={12} className="text-slate-300" />
    675:                          <div className="flex items-center gap-2 text-slate-600">
    676:                            <Clock size={12} className="text-slate-300" />
    685:                            record.off_duty_time ? "bg-slate-50 text-slate-600 border-slate-100" : "text-slate-300 border-transparent"
    687:                            {record.sessions?.length ? `${Math.floor((record.total_worked_minutes || 0) / 60)}h ${(record.total_worked_minutes || 0) % 60}m total` : (calculateDuration(record.check_in_time, record.off_duty_time) || '--')}
    696:                                : "bg-slate-100 text-slate-400"
    715:                              <p key={session.id} className="text-[9px] text-slate-500">
    721:                               <p className="text-[10px] font-medium text-slate-500 italic">
    722:                                 <span className="font-black text-slate-400 not-italic mr-1">MORNING:</span>
    733:                               <p className="text-[10px] font-medium text-slate-300 italic">No logs reported</p>
    ✓ • 349ms

## Activity

    $ $reads=@(@('server/routes/auth.ts',20,155),@('server/routes/users.ts',120,300),@('server/routes/users.ts',510,565),@('mobile-app/context/LocationContext.tsx',285,430),@('mobile-app/context/LocationContext.tsx',560,660),@('mobile-app/context/AuthContext.tsx',35,150),@('src/app/context/AuthContext.tsx',45,130)); foreach($x in $reads){$f=$x[0];$a=[int]$x[1];$b=[int]$x[2]; Write-Output "FILE $f L$a-L$b"; $lines=Get-Content $f; for($i=$a;$i -le $b -and $i -le $lines.Length;$i++){"$i`:$($lines[$i-1])"}}
    FILE server/routes/auth.ts L20-L155
    20:const REMEMBERED_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    21:
    22:const getCookieOptions = (maxAge?: number) => ({
    23:  httpOnly: true,
    24:  secure: process.env.NODE_ENV === 'production',
    25:  sameSite: 'lax' as const,
    26:  path: '/',
    27:  ...(maxAge === undefined ? {} : { maxAge })
    28:});
    29:
    30:const getSessionTtl = (rememberMe: boolean) => rememberMe ? REMEMBERED_SESSION_TTL_MS : SESSION_TTL_MS;
    31:const isMobileClient = (req: Request) => req.headers['x-client-type'] === 'mobile';
    32:const resetRiderDutyAtLogin = async (user: any, req: Request) => {
    33:  if (user.role !== 'rider') return;
    34:  await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [user.id]);
    35:  user.is_on_duty = false;
    36:  req.app.get('io')?.to('admin-room').emit('rider-status-updated', { riderId: user.id, riderName: user.name, type: 'duty', is_on_duty: false });
    37:};
    38:const toUserProfile = async (user: any) => {
    39:  const { password_hash, mfa_secret, refresh_token, refresh_token_expires_at, ...profile } = user;
    40:  const avatarId = profile.role === 'rider'
    41:    ? await getRiderAvatarPreference(String(profile.id))
    42:    : null;
    43:  return { ...profile, avatar_id: avatarId || getDefaultRiderAvatarId(String(profile.id)) };
    44:};
    45:
    46:const generateAccessToken = (user: any) => jwt.sign(
    47:  {
    48:    id: user.id,
    49:    email: user.email,
    50:    role: user.role,
    51:    department: user.department,
    52:    is_on_duty: user.is_on_duty,
    53:  },
    54:  getJwtSecret(),
    55:  { expiresIn: ACCESS_TOKEN_TTL }
    56:);
    57:
    58:const generateTokens = async (user: any, rememberMe: boolean, existingRefreshExpiresAt?: Date) => {
    59:  const refreshExpiresAt = existingRefreshExpiresAt || new Date(Date.now() + getSessionTtl(rememberMe));
    60:  const refreshTtlSeconds = Math.max(1, Math.floor((refreshExpiresAt.getTime() - Date.now()) / 1000));
    61:  const refreshExpiresAtSql = refreshExpiresAt
    62:    .toISOString().slice(0, 19).replace('T', ' ');
    63:  const accessToken = generateAccessToken(user);
    64:
    65:  const refreshToken = jwt.sign(
    66:    { id: user.id, rememberMe },
    67:    getRefreshSecret(),
    68:    { expiresIn: refreshTtlSeconds }
    69:  );
    70:
    71:  // Store refresh token in DB for rotation and revocation
    72:  await pool.query(
    73:    'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
    74:    [refreshToken, refreshExpiresAtSql, user.id]
    75:  );
    76:
    77:  return { accessToken, refreshToken };
    78:};
    79:
    80:// Login
    81:router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
    82:  try {
    83:    const { email, password, rememberMe: requestedRememberMe = false } = req.body || {};
    84:    const rememberMe = getRememberMe(req, requestedRememberMe);
    85:    if (!email || !password) {
    86:      return res.status(400).json({ error: 'Email and password are required' });
    87:    }
    88:
    89:    const isSuperAdmin = email.toLowerCase() === 'admin@company.com';
    90:
    91:    console.log('Login attempt for email:', email);
    92:    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    93:    const users = rows as any[];
    94:
    95:    if (users.length === 0) {
    96:      console.log('No user found with email:', email);
    97:      return res.status(401).json({ error: 'Invalid credentials' });
    98:    }
    99:
    100:    const user = users[0];
    101:
    102:    // Verify hashed password
    103:    const isPasswordValid = await argon2.verify(user.password_hash, password);
    104:    if (!isPasswordValid) {
    105:      console.log('Invalid password for email:', email);
    106:      return res.status(401).json({ error: 'Invalid credentials' });
    107:    }
    108:
    109:    // SPECIAL POWER: admin@company.com is ALWAYS active
    110:    if (!isSuperAdmin && user.status === 'inactive') {
    111:      return res.status(403).json({ error: 'Account is deactivated' });
    112:    }
    113:
    114:    // SPECIAL POWER: admin@company.com BYPASSES mandatory reset
    115:    if (!isSuperAdmin && user.require_password_reset) {
    116:      const challenge = await issueAuthChallenge(user.id, 'password_reset');
    117:      return res.json({
    118:        require_password_reset: true,
    119:        challenge,
    120:        role: user.role,
    121:        message: 'Must change password before proceeding'
    122:      });
    123:    }
    124:
    125:    // Check MFA status
    126:    if (!isSuperAdmin && process.env.NODE_ENV !== 'development' && user.mfa_enabled) {
    127:      return res.json({
    128:        mfa_required: true,
    129:        challenge: await issueAuthChallenge(user.id, 'mfa_login'),
    130:        message: 'Please enter your Google Authenticator code'
    131:      });
    132:    } else if (process.env.NODE_ENV !== 'development' && !isSuperAdmin && (user.role === 'personnel' || user.role === 'admin')) {
    133:      return res.json({
    134:        mfa_setup_required: true,
    135:        challenge: await issueAuthChallenge(user.id, 'mfa_setup'),
    136:        message: 'Security setup required: Please link your Google Authenticator'
    137:      });
    138:    }
    139:
    140:    // A fresh rider login starts connected but off duty.
    141:    await resetRiderDutyAtLogin(user, req);
    142:    // Success: Generate Tokens
    143:    const { accessToken, refreshToken } = await generateTokens(user, rememberMe);
    144:
    145:    // Set cookie (Secure, HttpOnly for Web)
    146:    const sessionCookieAge = rememberMe ? REMEMBERED_SESSION_TTL_MS : undefined;
    147:    res.cookie('authToken', accessToken, getCookieOptions(sessionCookieAge));
    148:    res.cookie('refreshToken', refreshToken, getCookieOptions(sessionCookieAge));
    149:
    150:    // Return user data
    151:    const userProfile = await toUserProfile(user);
    152:    res.json(isMobileClient(req) ? { ...userProfile, token: accessToken, refreshToken } : userProfile);
    153:  } catch (error) {
    154:    console.error('Login error:', error);
    155:    res.status(500).json({ error: 'Database or Internal server error' });
    FILE server/routes/users.ts L120-L300
    120:  }
    121:});
    122:
    123:// GET /attendance/daily (Admin only)
    124:router.get('/attendance/daily', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    125:  try {
    126:    const date = (req.query.date as string | undefined) || getPhilippineDateString();
    127:    const [rows]: any = await pool.query(`
    128:      SELECT u.id as rider_id, u.name as rider_name, u.email as rider_email, u.is_on_duty,
    129:             al.status, al.reason, al.check_in_time, al.off_duty_time, al.created_at,
    130:             al.absence_source, al.auto_absent_at, al.late_checkin_approved_by,
    131:             al.late_checkin_approved_at, late_approver.name AS late_checkin_approved_by_name,
    132:             (SELECT COUNT(*) FROM delivery_requests
    133:              WHERE assigned_rider_id = u.id
    134:                AND (delivery_date <= ? OR delivery_status = 'in_progress')
    135:                AND delivery_status NOT IN ('completed', 'failed', 'cancelled', 'disapproved')) as active_task_count,
    136:             (SELECT JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.handover_reason'))
    137:              FROM movement_events
    138:              WHERE rider_id = u.id
    139:                AND event_type = 'duty_off'
    140:                AND DATE(timestamp) = ?
    141:              ORDER BY timestamp DESC LIMIT 1) as handover_reason,
    142:             -- Integrity Score Calculation (Layer 4)
    143:             (SELECT GREATEST(0, 100 - (
    144:                (COUNT(CASE WHEN event_type = 'deviation_requested' THEN 1 END) * 10) +
    145:                (COUNT(CASE WHEN event_type = 'idle_alert' THEN 1 END) * 5)
    146:              )) FROM movement_events WHERE rider_id = u.id AND DATE(timestamp) = ?) as integrity_score
    147:      FROM users u
    148:      LEFT JOIN attendance_logs al ON u.id = al.rider_id AND al.date = ?
    149:      LEFT JOIN users late_approver ON late_approver.id = al.late_checkin_approved_by
    150:      WHERE u.role = 'rider'
    151:      ORDER BY u.name ASC
    152:    `, [date, date, date, date]);
    153:    const riders = await Promise.all(rows.map(async (row: any) => {
    154:      const summary = await getShiftSessionsForDate(pool, row.rider_id, date);
    155:      return { ...row, is_on_duty: Boolean(row.is_on_duty), sessions: summary.sessions, total_worked_minutes: summary.total_worked_minutes };
    156:    }));
    157:    res.json(riders);
    158:  } catch (error) {
    159:    console.error('Fetch attendance error:', error);
    160:    res.status(500).json({ error: 'Failed to fetch attendance' });
    161:  }
    162:});
    163:
    164:// GET /me/attendance (Rider only)
    165:router.get('/me/shift-session', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    166:  try {
    167:    const access = await getRiderShiftAccess(req.user!.id);
    168:    const session = await getCurrentShiftSession(pool, req.user!.id);
    169:    const [users]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [req.user!.id]);
    170:    const [ended]: any = await pool.query("SELECT end_source, end_time FROM shift_sessions WHERE rider_id=? AND session_state='closed' ORDER BY end_time DESC LIMIT 1", [req.user!.id]);
    171:    res.json({ session, is_on_duty: Boolean(users[0]?.is_on_duty) && !access.locked,
    172:      schedule: access.policy.active ? { date: access.policy.date, start_time: access.policy.startTime, end_time: access.policy.endTime, time_zone: 'Asia/Manila' } : null,
    173:      server_time: new Date().toISOString(), locked: access.locked, next_start_at: access.policy.nextStartAt,
    174:      last_end_source: ended[0]?.end_source || null, last_end_time: ended[0]?.end_time || null });
    175:  } catch (error) {
    176:    res.status(500).json({ error: 'Failed to fetch current shift' });
    177:  }
    178:});
    179:
    180:router.post('/attendance/:riderId/late-check-in-approval', authorize(['admin']), async (req: AuthRequest, res: Response) => {
    181:  const riderId = String(req.params.riderId);
    182:  const date = typeof req.body?.date === 'string' ? req.body.date : '';
    183:  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'A valid work date is required.' });
    184:  try {
    185:    const approval = await approveLateCheckIn(pool, { riderId, date, adminId: String(req.user!.id) });
    186:    const io = req.app.get('io');
    187:    io?.to('admin-room').emit('rider-status-updated', {
    188:      riderId, type: 'attendance', status: 'absent', absence_source: 'automatic_no_show',
    189:      late_checkin_approved: true, date,
    190:    });
    191:    io?.to('admin-room').emit('notification-added', {
    192:      id: `notif_late_checkin_${riderId}_${date}`,
    193:      message: `Late check-in approved for rider ${riderId}.`,
    194:      type: 'info',
    195:    });
    196:    io?.to(riderId).emit('attendance-updated', { status: 'absent', late_checkin_approved: true, date });
    197:    return res.json({ success: true, ...approval });
    198:  } catch (error: any) {
    199:    if (error instanceof ShiftSessionError && error.code === 'LATE_CHECKIN_NOT_ELIGIBLE') {
    200:      return res.status(409).json({ code: error.code, error: error.message });
    201:    }
    202:    console.error('Late check-in approval failed:', error);
    203:    return res.status(500).json({ error: 'Late check-in approval failed.' });
    204:  }
    205:});
    206:
    207:router.get('/me/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    208:  try {
    209:    const [rows]: any = await pool.query(
    210:      `SELECT status, reason, absence_source, auto_absent_at, late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`,
    211:      [req.user!.id]
    212:    );
    213:    res.json(rows[0] || { status: null });
    214:  } catch (error) {
    215:    res.status(500).json({ error: 'Failed to fetch personal attendance' });
    216:  }
    217:});
    218:
    219:// POST /:id/attendance (Rider only - Morning Check-in)
    220:router.post('/:id/attendance', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    221:  try {
    222:    const id = String(req.params.id);
    223:    const { status, reason, operation_id } = req.body;
    224:    const user = req.user! as any;
    225:    const io = req.app.get('io');
    226:
    227:    if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
    228:    if (!['present', 'absent', 'on_leave'].includes(status)) {
    229:      return res.status(400).json({ error: 'Invalid attendance status' });
    230:    }
    231:
    232:    if (status === 'present') {
    233:      const access = await getRiderShiftAccess(id);
    234:      if (access.locked) return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Outside rider shift hours.', next_start_at: access.policy.nextStartAt });
    235:      if (typeof operation_id !== 'string' || !operation_id.trim()) return res.status(400).json({ error: 'operation_id is required' });
    236:      const session = await startShiftSession(pool, { riderId: id, operationId: operation_id.trim() });
    237:      const [riders]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [id]);
    238:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    239:      io.to(id).emit('attendance-updated', { status });
    240:      return res.json({ success: true, session, is_on_duty: Boolean(riders[0]?.is_on_duty) });
    241:    }
    242:    await setNonPresentAttendance(pool, { riderId: id, status, reason });
    243:
    244:    // Notify Admin
    245:    const msg = status === 'present'
    246:      ? `Rider ${user.name} has checked in for shift.`
    247:      : `Rider ${user.name} is ${status.toUpperCase()} today. Reason: ${reason || 'N/A'}`;
    248:
    249:    io.to('admin-room').emit('notification-added', {
    250:      id: `notif_att_${Date.now()}`,
    251:      message: msg,
    252:      type: status === 'present' ? 'info' : 'warning'
    253:    });
    254:
    255:    // INSTANT SYNC: Tell all admins to refresh their rider availability lists
    256:    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status });
    257:
    258:    // Real-time sync for the rider
    259:    io.to(id).emit('attendance-updated', { status });
    260:
    261:    res.json({ success: true });
    262:  } catch (error: any) {
    263:    console.error('Attendance submit error:', error);
    264:    if (error instanceof ShiftSessionError) return res.status(409).json({ code: error.code, error: error.message });
    265:    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Attendance already logged for today' });
    266:    res.status(500).json({ error: 'Attendance log failed' });
    267:  }
    268:});
    269:
    270:// Toggle On-Duty status (Rider only)
    271:router.post('/:id/duty', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    272:  const id = String(req.params.id);
    273:  const { is_on_duty } = req.body;
    274:  const user = req.user! as any;
    275:  const io = req.app.get('io');
    276:  if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
    277:  if (typeof is_on_duty !== 'boolean') return res.status(400).json({ error: 'Duty status must be true or false' });
    278:  try {
    279:    if (is_on_duty) {
    280:      const access = await getRiderShiftAccess(id);
    281:      if (access.locked) return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Outside rider shift hours.', next_start_at: access.policy.nextStartAt });
    282:    }
    283:    const result = await setRiderAvailability(pool, { riderId: id, isOnDuty: is_on_duty });
    284:    io.to('admin-room').emit('rider-status-updated', { riderId: id, riderName: user.name, type: 'duty', is_on_duty });
    285:    if (is_on_duty) {
    286:      io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'attendance', status: 'present' });
    287:      io.to(id).emit('attendance-updated', { status: 'present' });
    288:    }
    289:    try {
    290:      await recordConnectivityLog({ riderId: String(id), riderName: user.name, eventType: is_on_duty ? 'duty_on' : 'duty_off', isOnDuty: is_on_duty });
    291:    } catch (logError) { console.error('Failed to log duty connectivity event:', logError); }
    292:    return res.json({ success: true, ...result });
    293:  } catch (error: any) {
    294:    if (error instanceof ShiftSessionError) {
    295:      const status = error.code === 'HANDOVER_REQUIRED' ? 400 : 409;
    296:      return res.status(status).json({ code: error.code, error: error.message });
    297:    }
    298:    console.error('Duty toggle failed:', error);
    299:    return res.status(500).json({ error: 'Duty toggle failed' });
    300:  }
    FILE server/routes/users.ts L510-L565
    510:          continue;
    511:        }
    512:
    513:        acceptedEventIds.push(eventId);
    514:      } catch (error) {
    515:        await pool.query('DELETE FROM location_event_receipts WHERE event_id = ?', [eventId]);
    516:        throw error;
    517:      }
    518:    }
    519:
    520:    res.json({ acceptedEventIds, rejected });
    521:  } catch (error) {
    522:    console.error('Batch location upload failed:', error);
    523:    res.status(500).json({ error: 'Batch location upload failed' });
    524:  }
    525:});
    526:
    527:router.post('/:id/shift/end', authorize(['rider']), async (req: AuthRequest, res: Response) => {
    528:  const id = String(req.params.id);
    529:  const { operation_id, reason } = req.body;
    530:  const user = req.user! as any;
    531:  const io = req.app.get('io');
    532:  if (user.id !== id) return res.status(403).json({ error: 'Forbidden' });
    533:  if (typeof operation_id !== 'string' || !operation_id.trim()) return res.status(400).json({ error: 'operation_id is required' });
    534:
    535:  try {
    536:    const access = await getRiderShiftAccess(id);
    537:    if (access.closed) return res.json({ success: true, session: access.closed, is_on_duty: false });
    538:    if (access.locked) {
    539:      const [recent]: any = await pool.query("SELECT * FROM shift_sessions WHERE rider_id=? AND end_source='scheduled' AND DATE(start_time)=? ORDER BY end_time DESC LIMIT 1", [id, access.policy.date]);
    540:      if (recent[0]) return res.json({ success: true, session: recent[0], is_on_duty: false });
    541:      return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', error: 'Shift hours have ended for today.' });
    542:    }
    543:    const session = await endShiftSession(pool, { riderId: id, operationId: operation_id.trim(), reason });
    544:    io.to('admin-room').emit('rider-status-updated', { riderId: id, type: 'shift', is_on_duty: false });
    545:    io.to('admin-room').emit('rider-status-updated', { riderId: id, riderName: user.name, type: 'duty', is_on_duty: false });
    546:    if (session.active_task_count_at_end) {
    547:      io.to('admin-room').emit('notification-added', {
    548:        id: `notif_handover_${Date.now()}`,
    549:        message: `Rider ${user.name} ended a shift with ${session.active_task_count_at_end} unfinished task(s). Reason: ${session.handover_reason}`,
    550:        type: 'warning'
    551:      });
    552:    }
    553:    try {
    554:      await recordConnectivityLog({ riderId: String(id), riderName: user.name, eventType: 'duty_off', isOnDuty: false, metadata: session.handover_reason ? { handover_reason: session.handover_reason, active_task_count: session.active_task_count_at_end } : null });
    555:    } catch (logError) { console.error('Failed to log shift end connectivity:', logError); }
    556:    return res.json({ success: true, session, is_on_duty: false });
    557:  } catch (error: any) {
    558:    if (error instanceof ShiftSessionError) {
    559:      const status = error.code === 'HANDOVER_REQUIRED' ? 400 : 409;
    560:      return res.status(status).json({ code: error.code, error: error.message });
    561:    }
    562:    console.error('Shift end failed:', error);
    563:    return res.status(500).json({ error: 'Shift end failed' });
    564:  }
    565:});
    FILE mobile-app/context/LocationContext.tsx L285-L430
    285:  const lastLocationRef = useRef<LocationState['lastLocation']>(null);
    286:  const socketRef = useRef<ReturnType<typeof io> | null>(null);
    287:  const activeRequestId = useRef<string | null>(null);
    288:  const foregroundSubscription = useRef<Location.LocationSubscription | null>(null);
    289:  const socketAuthRefreshInFlight = useRef(false);
    290:  const heartbeatInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    291:  const hasConfirmedShiftStatus = useRef(false);
    292:  const lastShiftUnlockCheck = useRef(0);
    293:
    294:  useEffect(() => {
    295:    lastLocationRef.current = lastLocation;
    296:  }, [lastLocation]);
    297:
    298:  // --- DUTY MANAGEMENT ---
    299:  const toggleDuty = async (status: boolean): Promise<DutyToggleResult> => {
    300:    if (!user?.id) return 'failed';
    301:    if (status && shiftHoursLocked) {
    302:      Alert.alert('Shift hours locked', 'You can go On Duty during the next scheduled shift.');
    303:      return 'failed';
    304:    }
    305:
    306:    if (status) {
    307:      if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    308:        Alert.alert('Attendance already submitted', 'Your attendance is recorded as absent or on leave. Contact Admin if this needs to change.');
    309:        return 'failed';
    310:      }
    311:    }
    312:
    313:    try {
    314:      const response = await updateDutyStatus(user.id, status);
    315:      const confirmedDuty = Boolean(response.data?.is_on_duty);
    316:      if (confirmedDuty && response.data?.session) {
    317:        setHasOpenShift(true);
    318:        setShiftStartedAt(response.data.session.start_time ?? null);
    319:        setAttendanceStatus('present');
    320:        try {
    321:          await AsyncStorage.setItem(STORAGE_ATTENDANCE_DATE, new Date().toISOString().split('T')[0]);
    322:          await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, 'present');
    323:        } catch (storageError) {
    324:          console.warn('[LocationContext] Attendance cache write failed after going On Duty:', storageError);
    325:        }
    326:      }
    327:      setIsOnDuty(confirmedDuty);
    328:      try { await AsyncStorage.setItem(STORAGE_DUTY_STATUS, confirmedDuty ? 'true' : 'false'); }
    329:      catch (storageError) { console.warn('[LocationContext] Duty cache write failed after server confirmation:', storageError); }
    330:      void queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
    331:
    332:      return 'success';
    333:    } catch (err: any) {
    334:      console.error('Failed to update duty status:', err);
    335:
    336:      // SENIOR UX: Capture specific server-side validation error
    337:      if (err.response?.status === 400) {
    338:        if (err.response?.data?.code === 'HANDOVER_REQUIRED') return 'handover_required';
    339:        const serverError = err.response?.data?.error || "Cannot go off duty while a job is in progress.";
    340:        Alert.alert("Active Task Detected", serverError);
    341:      } else if (err.response?.status === 409) {
    342:        Alert.alert('Cannot go On Duty', err.response?.data?.error || 'Please try again.');
    343:      } else {
    344:        Alert.alert("Connection Error", "Could not update your duty status. Please check your internet connection.");
    345:      }
    346:      return 'failed';
    347:    }
    348:  };
    349:
    350:  const endShift = async (reason?: string): Promise<DutyToggleResult> => {
    351:    if (!user?.id || !hasOpenShift) return 'failed';
    352:    try {
    353:      const operationId = await getOrCreateShiftOperationId('end');
    354:      const response = await endShiftRequest(user.id, operationId, reason);
    355:      setHasOpenShift(false);
    356:      setShiftStartedAt(null);
    357:      await applyCommittedDutyResult('end', Boolean(response.data?.is_on_duty), setIsOnDuty);
    358:      return 'success';
    359:    } catch (err: any) {
    360:      console.error('Failed to end shift:', err);
    361:      if (err.response?.status === 400 && err.response?.data?.code === 'HANDOVER_REQUIRED') return 'handover_required';
    362:      const msg = err.response?.data?.error || 'Could not end your shift. Please try again.';
    363:      Alert.alert('Shift End Error', msg);
    364:      return 'failed';
    365:    }
    366:  };
    367:
    368:  const checkIn = async (status: 'present' | 'absent' | 'on_leave', reason?: string) => {
    369:    if (!user?.id) return false;
    370:    if (status === 'present' && attendanceStatus === 'absent' && !isLateCheckInApproved) {
    371:      Alert.alert('Admin approval required', 'Contact Admin to approve a late check-in before starting your shift.');
    372:      return false;
    373:    }
    374:    if (status === 'present' && shiftHoursLocked) {
    375:      Alert.alert('Shift hours locked', 'You can start your shift during the next scheduled hours.');
    376:      return false;
    377:    }
    378:
    379:    try {
    380:      const operationId = status === 'present' ? await getOrCreateShiftOperationId('start') : undefined;
    381:      const response = await submitAttendance(user.id, status, reason, operationId);
    382:      const todayStr = new Date().toISOString().split('T')[0];
    383:      try { await AsyncStorage.setItem(STORAGE_ATTENDANCE_DATE, todayStr); }
    384:      catch (storageError) { console.warn('[LocationContext] Attendance date cache write failed after server confirmation:', storageError); }
    385:      try { await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, status); }
    386:      catch (storageError) { console.warn('[LocationContext] Attendance status cache write failed after server confirmation:', storageError); }
    387:      setAttendanceStatus(status);
    388:      setIsLateCheckInApproved(false);
    389:      setIsShiftStatusReady(true);
    390:      if (status === 'present') {
    391:        setHasOpenShift(Boolean(response.data?.session && !response.data.session.end_time));
    392:        setShiftStartedAt(response.data?.session?.start_time ?? null);
    393:        const confirmedDuty = Boolean(response.data?.is_on_duty);
    394:        if (operationId) await applyCommittedDutyResult('start', confirmedDuty, setIsOnDuty);
    395:        else setIsOnDuty(confirmedDuty);
    396:      } else {
    397:        setHasOpenShift(false);
    398:        setShiftStartedAt(null);
    399:        setIsOnDuty(false);
    400:        try { await AsyncStorage.setItem(STORAGE_DUTY_STATUS, 'false'); }
    401:        catch (storageError) { console.warn('[LocationContext] Duty cache write failed after attendance confirmation:', storageError); }
    402:      }
    403:
    404:      queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
    405:      return true;
    406:    } catch (err: any) {
    407:      console.error('Attendance failed:', err);
    408:      const msg = err.response?.data?.error || "Failed to log attendance. Please try again.";
    409:      Alert.alert("Attendance Error", msg);
    410:      return false;
    411:    }
    412:  };
    413:
    414:  // --- HEARTBEAT MECHANISM ---
    415:  const sendHeartbeat = async () => {
    416:    if (!socketRef.current?.connected || !user?.id || !isOnDuty) return;
    417:    if (user.role !== 'rider') return;
    418:
    419:    // Health metrics
    420:    const battery = await Battery.getBatteryLevelAsync();
    421:    const network = await Network.getNetworkStateAsync();
    422:
    423:    console.log('[Heartbeat] Sending presence keep-alive...');
    424:    socketRef.current?.emit('update-location', {
    425:      riderId: user.id,
    426:      lat: null,
    427:      lng: null,
    428:      heading: null,
    429:      timestamp: Date.now(),
    430:      requestId: activeRequestId.current || 'idle',
    FILE mobile-app/context/LocationContext.tsx L560-L660
    560:    }
    561:  }, [locationPermission, publishSafeLocation, user?.role]);
    562:
    563:  const syncStatus = useCallback(async () => {
    564:    setIsShiftStatusReady(false);
    565:    hasConfirmedShiftStatus.current = false;
    566:    try {
    567:      const serverData = await getMyAttendance();
    568:      const shiftData = await getMyShiftSession();
    569:      const confirmedDuty = Boolean(shiftData.is_on_duty);
    570:      setConfirmedSchedule(shiftData.schedule ? { date: shiftData.schedule.date, start_time: shiftData.schedule.start_time, end_time: shiftData.schedule.end_time } : null);
    571:      setHasConfirmedSchedule(true);
    572:      if (user?.id) {
    573:        const key = `@shift_schedule_${user.id}`;
    574:        if (shiftData.schedule) await AsyncStorage.setItem(key, JSON.stringify(shiftData.schedule));
    575:        else await AsyncStorage.removeItem(key);
    576:      }
    577:      setServerShiftLocked(Boolean(shiftData.locked));
    578:      setNextShiftStartAt(shiftData.next_start_at ?? null);
    579:      setLastEndSource(shiftData.last_end_source ?? null);
    580:      setShiftClock(Date.now());
    581:      setHasOpenShift(Boolean(shiftData.session && !shiftData.session.end_time));
    582:      setShiftStartedAt(shiftData.session?.start_time ?? null);
    583:      setIsOnDuty(confirmedDuty);
    584:      await AsyncStorage.setItem(STORAGE_DUTY_STATUS, confirmedDuty ? 'true' : 'false');
    585:      if (serverData.status) {
    586:        setAttendanceStatus(serverData.status);
    587:        setIsLateCheckInApproved(serverData.status === 'absent' && Boolean(serverData.late_checkin_approved_at));
    588:        await AsyncStorage.setItem(STORAGE_ATTENDANCE_STATUS, serverData.status);
    589:      } else {
    590:        setAttendanceStatus(null);
    591:        setIsLateCheckInApproved(false);
    592:        await AsyncStorage.removeItem(STORAGE_ATTENDANCE_STATUS);
    593:      }
    594:      setIsShiftStatusReady(true);
    595:      hasConfirmedShiftStatus.current = true;
    596:      return serverData.status;
    597:    } catch {
    598:      // Keep the last known values for offline work, but do not treat cached
    599:      // attendance or availability as server confirmation.
    600:      if (user?.id && !hasConfirmedSchedule) {
    601:        try {
    602:          const cached = await AsyncStorage.getItem(`@shift_schedule_${user.id}`);
    603:          if (cached) {
    604:            const schedule = JSON.parse(cached);
    605:            if (typeof schedule.date === 'string' && typeof schedule.start_time === 'string' && typeof schedule.end_time === 'string') {
    606:              setConfirmedSchedule({ date: schedule.date, start_time: schedule.start_time, end_time: schedule.end_time });
    607:              setHasConfirmedSchedule(true);
    608:            }
    609:          }
    610:        } catch { /* Keep shift access locked when cached schedule is unavailable. */ }
    611:      }
    612:      return null;
    613:    }
    614:  }, [user?.id, hasConfirmedSchedule]);
    615:
    616:  useEffect(() => {
    617:    if (!user?.id || !serverShiftLocked || !confirmedSchedule || isNetworkReachable === false) return;
    618:    if (isOutsideShiftHours(confirmedSchedule, new Date(shiftClock))) return;
    619:    if (shiftClock - lastShiftUnlockCheck.current < 60_000) return;
    620:    lastShiftUnlockCheck.current = shiftClock;
    621:    void syncStatus();
    622:  }, [confirmedSchedule, isNetworkReachable, serverShiftLocked, shiftClock, syncStatus, user?.id]);
    623:
    624:  useEffect(() => {
    625:    const timer = setInterval(() => setShiftClock(Date.now()), 15_000);
    626:    return () => clearInterval(timer);
    627:  }, []);
    628:
    629:  useEffect(() => {
    630:    setHasConfirmedSchedule(false);
    631:    setConfirmedSchedule(null);
    632:    setServerShiftLocked(false);
    633:  }, [user?.id]);
    634:
    635:  const refreshAttendance = async () => {
    636:    return await syncStatus();
    637:  };
    638:
    639:  const verifyStatusThenRefreshTasks = useCallback(async () => {
    640:    if (!user?.id) return;
    641:    await syncStatus();
    642:    if (hasConfirmedShiftStatus.current) {
    643:      await queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
    644:    }
    645:  }, [queryClient, syncStatus, user?.id]);
    646:
    647:  useEffect(() => {
    648:    let previousReachability: boolean | null = null;
    649:    const unsubscribe = NetInfo.addEventListener((state) => {
    650:      const reachable = state.isConnected === true && state.isInternetReachable !== false;
    651:      setIsNetworkReachable(reachable);
    652:
    653:      if (previousReachability === true && !reachable) {
    654:        hasConfirmedShiftStatus.current = false;
    655:        setIsShiftStatusReady(false);
    656:      } else if (previousReachability === false && reachable) {
    657:        void verifyStatusThenRefreshTasks();
    658:      }
    659:      previousReachability = reachable;
    660:    });
    FILE mobile-app/context/AuthContext.tsx L35-L150
    35:export function AuthProvider({ children }: { children: React.ReactNode }) {
    36:  const [user, setUser] = useState<any>(null);
    37:  const [token, setToken] = useState<string | null>(null);
    38:  const [isLoading, setIsLoading] = useState(true);
    39:  const [isAuthenticating, setIsAuthenticating] = useState(false);
    40:  const segments = useSegments();
    41:  const router = useRouter();
    42:  const navigationState = useRootNavigationState();
    43:
    44:  useEffect(() => {
    45:    const redirect = getAuthRedirect({
    46:      isLoading,
    47:      user,
    48:      firstSegment: segments[0],
    49:      navigationReady: Boolean(navigationState?.key),
    50:    });
    51:    if (redirect) router.replace(redirect);
    52:  }, [user, isLoading, navigationState?.key, router, segments]);
    53:
    54:  useEffect(() => {
    55:    // Listen for global auth failures (401s)
    56:    setAuthFailureListener(() => {
    57:      console.warn('[AUTH] Global interceptor triggered logout');
    58:      setToken(null);
    59:      setUser(null);
    60:    });
    61:
    62:    const check = async () => {
    63:      try {
    64:        const shouldRestoreSession = await AuthManager.shouldRestoreSession();
    65:        if (!shouldRestoreSession) {
    66:          await AuthManager.clearSession();
    67:          setToken(null);
    68:          setUser(null);
    69:          return;
    70:        }
    71:
    72:        const userData = await AuthManager.getUserData();
    73:        const token = await AuthManager.getValidToken();
    74:
    75:        if (token && userData) {
    76:          resetAuthStatus();
    77:          setToken(token);
    78:          setUser(userData);
    79:        } else {
    80:          await AuthManager.clearSession();
    81:          setToken(null);
    82:          setUser(null);
    83:        }
    84:      } finally {
    85:        setIsLoading(false);
    86:      }
    87:    };
    88:    check();
    89:  }, []);
    90:
    91:  const login = async (email: string, password: string, keepSignedIn: boolean) => {
    92:    setIsAuthenticating(true);
    93:    try {
    94:      const res = await api.post('/api/auth/login', { email, password });
    95:      const data = res.data;
    96:
    97:      // Handle password reset requirement
    98:      if (data.require_password_reset) {
    99:        return {
    100:          success: false,
    101:          requirePasswordReset: true,
    102:          userId: data.id || data.userId
    103:        };
    104:      }
    105:
    106:      if (data.token && data.refreshToken) {
    107:        await AuthManager.saveSession(data.token, data.refreshToken, data, keepSignedIn);
    108:        resetAuthStatus();
    109:
    110:        const currentToken = await AuthManager.getAccessToken();
    111:        if (!currentToken) return { success: false, error: 'Your session expired. Please sign in again.' };
    112:
    113:        setToken(currentToken);
    114:        setUser(data);
    115:        return { success: true };
    116:      }
    117:      return { success: false, error: 'No token' };
    118:    } catch (err: any) {
    119:      return { success: false, error: err.response?.data?.error || 'Fail' };
    120:    } finally {
    121:      setIsAuthenticating(false);
    122:    }
    123:  };
    124:
    125:  const logout = async () => {
    126:    try {
    127:      await unregisterFcmToken();
    128:    } catch {
    129:      // Logout must still complete when the device is offline.
    130:    }
    131:    try {
    132:      await api.post('/api/auth/logout', { userId: user?.id });
    133:    } catch (e) {}
    134:    await AuthManager.clearSession();
    135:
    136:    // --- PRIVACY SYNC: Clear duty status ---
    137:    await AsyncStorage.setItem('@is_on_duty', 'false');
    138:
    139:    await AsyncStorage.multiRemove(['@rider_id', '@active_request_id']);
    140:    resetAuthStatus();
    141:    setToken(null);
    142:    setUser(null);
    143:  };
    144:
    145:  const updateAvatar = async (avatarId: string): Promise<void> => {
    146:    if (!user) throw new Error('A rider profile is required');
    147:    const response = await api.patch('/api/users/me/avatar', { avatar_id: avatarId });
    148:    const confirmedAvatarId = response.data?.avatar_id;
    149:    if (confirmedAvatarId !== avatarId) throw new Error('The avatar update was not confirmed');
    150:    const updatedUser = { ...user, avatar_id: confirmedAvatarId, avatarId: confirmedAvatarId };
    FILE src/app/context/AuthContext.tsx L45-L130
    45:        retryDelayMs = 1000;
    46:        const storedUserJson = localStorage.getItem('rememberedUser') || sessionStorage.getItem('sessionUser');
    47:        let expiredUserId: string | undefined;
    48:        try {
    49:          expiredUserId = storedUserJson ? (JSON.parse(storedUserJson) as User).id : undefined;
    50:        } catch {
    51:          expiredUserId = undefined;
    52:        }
    53:        clearPersonnelV2Draft(expiredUserId, localStorage);
    54:        setUser(null);
    55:        localStorage.removeItem('rememberedUser');
    56:        sessionStorage.removeItem('sessionUser');
    57:      } else {
    58:        retryTimeout = window.setTimeout(() => { void restoreSession(); }, retryDelayMs);
    59:        retryDelayMs = Math.min(retryDelayMs * 2, 30_000);
    60:      }
    61:    };
    62:    void restoreSession();
    63:    const refreshInterval = window.setInterval(() => { void restoreSession(); }, 45 * 60 * 1000);
    64:    return () => {
    65:      active = false;
    66:      window.clearInterval(refreshInterval);
    67:      if (retryTimeout !== undefined) window.clearTimeout(retryTimeout);
    68:    };
    69:  }, []);
    70:
    71:  const login: AuthContextType['login'] = async (email, password, rememberMe = false) => {
    72:    try {
    73:      const response = await fetch(`${API_URL}/auth/login`, {
    74:        method: 'POST',
    75:        headers: { 'Content-Type': 'application/json' },
    76:        body: JSON.stringify({ email, password, rememberMe }),
    77:        credentials: 'include'
    78:      });
    79:
    80:      const data = await response.json();
    81:
    82:      if (response.ok) {
    83:        if (data.require_password_reset) {
    84:          return {
    85:            success: false,
    86:            requirePasswordReset: true,
    87:            challenge: data.challenge,
    88:            role: data.role
    89:          };
    90:        }
    91:        if (data.mfa_required) {
    92:          return { success: false, mfa_required: true, challenge: data.challenge };
    93:        }
    94:        if (data.mfa_setup_required) {
    95:          return { success: false, mfa_setup_required: true, challenge: data.challenge };
    96:        }
    97:
    98:        if (user?.id && user.id !== data.id) {
    99:          clearPersonnelV2Draft(user.id, localStorage);
    100:        }
    101:        setUser(data);
    102:        localStorage.removeItem('currentUser');
    103:        sessionStorage.removeItem('sessionUser');
    104:        localStorage.removeItem('rememberedUser');
    105:        const storage = rememberMe ? localStorage : sessionStorage;
    106:        storage.setItem(rememberMe ? 'rememberedUser' : 'sessionUser', JSON.stringify(data));
    107:        return { success: true };
    108:      }
    109:      return { success: false, error: data.error || 'Login failed' };
    110:    } catch (error: any) {
    111:      console.error(error);
    112:      return { success: false, error: error.message };
    113:    }
    114:  };
    115:
    116:  const logout = async () => {
    117:    clearPersonnelV2Draft(user?.id, localStorage);
    118:    // Prevent a shared device from receiving the previous account's browser pushes.
    119:    try {
    120:      if ('serviceWorker' in navigator) {
    121:        const registration = await navigator.serviceWorker.ready;
    122:        const subscription = await registration.pushManager?.getSubscription();
    123:        if (subscription) {
    124:          await fetch('/api/notifications/web-push/subscribe', {
    125:            method: 'DELETE',
    126:            headers: { 'Content-Type': 'application/json' },
    127:            credentials: 'include',
    128:            body: JSON.stringify({ endpoint: subscription.endpoint }),
    129:          });
    130:          await subscription.unsubscribe();
    ✓ • 334ms

## Activity

    $ $reads=@(@('server/services/shiftSessions.ts',18,140),@('mobile-app/components/ShiftControlCard.tsx',45,215),@('mobile-app/services/apiService.ts',160,205),@('mobile-app/app/(tabs)/_layout.tsx',1,65)); foreach($x in $reads){$f=$x[0];$a=[int]$x[1];$b=[int]$x[2]; Write-Output "FILE $f L$a-L$b"; $lines=Get-Content -LiteralPath $f; for($i=$a;$i -le $b -and $i -le $lines.Length;$i++){"$i`:$($lines[$i-1])"}}; rg -n --glob '!graphify-out/**' --glob '!mobile-admin/.expo/**' "end_source='scheduled'|end_source = 'scheduled'|automatic_no_show|auto_absent|no.show|scheduled.*shift|close.*shift" server
    FILE server/services/shiftSessions.ts L18-L140
    18:export async function startShiftSession(db: Db, input: { riderId: string; operationId: string }) {
    19:  return transition(db, input.riderId, async (conn) => {
    20:    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='start' LIMIT 1`, [input.riderId, input.operationId]);
    21:    if (replay[0]) return replay[0];
    22:    const [opened] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    23:    if (opened[0]) {
    24:      await recordOperation(conn, input.riderId, input.operationId, 'start', opened[0].id);
    25:      return opened[0];
    26:    }
    27:    const [attendanceRows] = await conn.query(`SELECT id, status, absence_source,
    28:      late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs
    29:      WHERE rider_id = ? AND date = ${TODAY} LIMIT 1 FOR UPDATE`, [input.riderId]);
    30:    const attendance = attendanceRows[0];
    31:    if (attendance && attendance.status !== 'present') {
    32:      const approvedAutoAbsence = attendance.status === 'absent'
    33:        && attendance.absence_source === 'automatic_no_show'
    34:        && attendance.late_checkin_approved_by
    35:        && attendance.late_checkin_approved_at;
    36:      if (!approvedAutoAbsence) {
    37:        throw new ShiftSessionError('ATTENDANCE_CONFLICT', 'Attendance is already recorded as absent or on leave today. Contact Admin if this needs to change.');
    38:      }
    39:      await conn.query(`UPDATE attendance_logs SET status='present', check_in_time=${NOW} WHERE id=?`, [attendance.id]);
    40:    }
    41:    const id = `shift_${crypto.randomUUID()}`;
    42:    if (!attendance) {
    43:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW})`, [`att_${crypto.randomUUID()}`, input.riderId]);
    44:    }
    45:    // Starting attendance opens a shift; going online is a separate rider action.
    46:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    47:    await conn.query(`INSERT INTO shift_sessions (id,rider_id,start_time,session_state,start_operation_id) VALUES (?, ?, ${NOW}, 'open', ?)`, [id, input.riderId, input.operationId]);
    48:    await recordOperation(conn, input.riderId, input.operationId, 'start', id);
    49:    const [created] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [id]);
    50:    return created[0];
    51:  });
    52:}
    53:
    54:export async function setRiderAvailability(db: Db, input: { riderId: string; isOnDuty: boolean }) {
    55:  return transition(db, input.riderId, async (conn) => {
    56:    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1", [input.riderId]);
    57:    let session = open[0] || null;
    58:    if (input.isOnDuty) {
    59:      const [attendance] = await conn.query(`SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ${TODAY} LIMIT 1`, [input.riderId]);
    60:      if (attendance[0] && attendance[0].status !== 'present') {
    61:        throw new ShiftSessionError('ATTENDANCE_CONFLICT', 'Attendance is already recorded as absent or on leave today.');
    62:      }
    63:      await conn.query(`INSERT INTO attendance_logs (id,rider_id,date,status,check_in_time) VALUES (?, ?, ${TODAY}, 'present', ${NOW}) ON DUPLICATE KEY UPDATE check_in_time=IF(status='present',check_in_time,${NOW}), status='present'`, [`att_${crypto.randomUUID()}`, input.riderId]);
    64:      if (!session) {
    65:        const shiftId = `shift_${crypto.randomUUID()}`;
    66:        const operationId = `duty_${crypto.randomUUID()}`;
    67:        await conn.query(`INSERT INTO shift_sessions (id,rider_id,start_time,session_state,start_operation_id) VALUES (?, ?, ${NOW}, 'open', ?)`, [shiftId, input.riderId, operationId]);
    68:        const [created] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [shiftId]);
    69:        session = created[0];
    70:      }
    71:    }
    72:
    73:    await conn.query('UPDATE users SET is_on_duty = ? WHERE id = ?', [input.isOnDuty, input.riderId]);
    74:    await conn.query(`INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,?, ?,NULL,${NOW})`, [
    75:      `move_${crypto.randomUUID()}`, input.riderId, input.isOnDuty ? 'duty_on' : 'duty_off',
    76:      input.isOnDuty ? 'Rider went online' : 'Rider went offline',
    77:    ]);
    78:    return { session, is_on_duty: input.isOnDuty };
    79:  });
    80:}
    81:
    82:export async function endShiftSession(db: Db, input: { riderId: string; operationId: string; reason?: string }) {
    83:  return transition(db, input.riderId, async (conn) => {
    84:    const [replay] = await conn.query(`SELECT ss.* FROM shift_operation_receipts sr JOIN shift_sessions ss ON ss.id=sr.session_id WHERE sr.rider_id=? AND sr.operation_id=? AND sr.operation_kind='end' LIMIT 1`, [input.riderId, input.operationId]);
    85:    if (replay[0]) return replay[0];
    86:    const [open] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1 FOR UPDATE", [input.riderId]);
    87:    if (!open[0]) throw new ShiftSessionError('NO_OPEN_SHIFT', 'There is no open shift to end.');
    88:    const [tasks] = await conn.query(activeTaskSql, [input.riderId]);
    89:    const reason = input.reason?.trim() || '';
    90:    if (tasks.length && !reason) throw new ShiftSessionError('HANDOVER_REQUIRED', `Cannot go off duty with ${tasks.length} active tasks. Please provide a handover reason.`);
    91:    await conn.query(`UPDATE shift_sessions SET end_time=${NOW}, session_state='closed', end_operation_id=?, handover_reason=?, active_task_count_at_end=? WHERE id=?`, [input.operationId, reason || null, tasks.length, open[0].id]);
    92:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    93:    await conn.query(`UPDATE attendance_logs SET off_duty_time=${NOW} WHERE rider_id=? AND date=DATE(?)`, [input.riderId, open[0].start_time]);
    94:    const metadata = tasks.length || reason ? JSON.stringify({ ...(reason ? { handover_reason: reason } : {}), active_task_count: tasks.length }) : null;
    95:    await conn.query(`INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,'duty_off',?,?,${NOW})`, [`move_${crypto.randomUUID()}`, input.riderId, `Rider toggled duty OFF${tasks.length ? ' (Handover)' : ''}`, metadata]);
    96:    await recordOperation(conn, input.riderId, input.operationId, 'end', open[0].id);
    97:    const [closed] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [open[0].id]);
    98:    return closed[0];
    99:  });
    100:}
    101:
    102:export async function setNonPresentAttendance(db: Db, input: { riderId: string; status: 'absent' | 'on_leave'; reason?: string }) {
    103:  return transition(db, input.riderId, async (conn) => {
    104:    const [open] = await conn.query("SELECT id FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' LIMIT 1 FOR UPDATE", [input.riderId]);
    105:    if (open[0]) throw new ShiftSessionError('OPEN_SHIFT', 'End your current shift before changing attendance status.');
    106:
    107:    await conn.query(`INSERT INTO attendance_logs (id, rider_id, date, status, reason, check_in_time)
    108:      VALUES (?, ?, ${TODAY}, ?, ?, ${NOW})
    109:      ON DUPLICATE KEY UPDATE check_in_time=IF(status <> ?, ${NOW}, check_in_time), reason=?, status=?`,
    110:    [`att_${crypto.randomUUID()}`, input.riderId, input.status, input.reason || null, input.status, input.reason || null, input.status]);
    111:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    112:    return { status: input.status };
    113:  });
    114:}
    115:
    116:export async function approveLateCheckIn(
    117:  db: Db,
    118:  input: { riderId: string; date: string; adminId: string },
    119:  now: Date = new Date(),
    120:) {
    121:  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date !== getPhilippineDateTime(now).date) {
    122:    throw new ShiftSessionError('LATE_CHECKIN_NOT_ELIGIBLE', 'Late check-in approval is available only for today.');
    123:  }
    124:  return transition(db, input.riderId, async (conn) => {
    125:    const [rows] = await conn.query(`SELECT status, absence_source, late_checkin_approved_at
    126:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1 FOR UPDATE`, [input.riderId, input.date]);
    127:    const attendance = rows[0];
    128:    if (attendance?.status !== 'absent' || attendance.absence_source !== 'automatic_no_show' || attendance.late_checkin_approved_at) {
    129:      throw new ShiftSessionError('LATE_CHECKIN_NOT_ELIGIBLE', 'Only an unapproved automatic no-show can be approved for late check-in.');
    130:    }
    131:    await conn.query(`UPDATE attendance_logs SET late_checkin_approved_by=?, late_checkin_approved_at=${NOW}
    132:      WHERE rider_id=? AND date=? AND status='absent' AND absence_source='automatic_no_show' AND late_checkin_approved_at IS NULL`,
    133:    [input.adminId, input.riderId, input.date]);
    134:    const [updated] = await conn.query(`SELECT late_checkin_approved_by, late_checkin_approved_at
    135:      FROM attendance_logs WHERE rider_id=? AND date=? LIMIT 1`, [input.riderId, input.date]);
    136:    return updated[0];
    137:  });
    138:}
    139:
    140:async function recordOperation(conn: any, riderId: string, operationId: string, kind: 'start' | 'end', sessionId: string) {
    FILE mobile-app/components/ShiftControlCard.tsx L45-L215
    45:
    46:  const activeTaskCount = useMemo(() => tasks.filter(task => {
    47:    const tab = getRiderTaskTab(task);
    48:    return tab === 'today' || tab === 'overdue' || task.delivery_status === 'in_progress';
    49:  }).length, [tasks]);
    50:
    51:  const startTime = formatShiftStartTime(shiftStartedAt);
    52:  const statusLabel = !isShiftStatusReady
    53:    ? 'Checking status'
    54:    : shiftHoursLocked
    55:      ? 'SHIFT CLOSED'
    56:    : hasOpenShift
    57:      ? isOnDuty ? 'ON DUTY' : 'OFF DUTY'
    58:      : attendanceStatus === 'present'
    59:        ? 'OFF DUTY'
    60:        : attendanceStatus === 'absent'
    61:          ? 'Absent'
    62:          : attendanceStatus === 'on_leave'
    63:            ? 'On leave'
    64:            : 'OFF DUTY';
    65:
    66:  const handleToggleAvailability = async () => {
    67:    setIsBusy(true);
    68:    try {
    69:      await toggleDuty(!isOnDuty);
    70:    } finally {
    71:      setIsBusy(false);
    72:    }
    73:  };
    74:
    75:  const handleLateCheckIn = async () => {
    76:    setIsBusy(true);
    77:    try {
    78:      await checkIn('present');
    79:    } finally {
    80:      setIsBusy(false);
    81:    }
    82:  };
    83:
    84:  const handleEndShift = async () => {
    85:    setIsBusy(true);
    86:    try {
    87:      const result = await endShift();
    88:      if (result === 'handover_required') {
    89:        setShowShiftEnd(false);
    90:        setShowHandover(true);
    91:        return false;
    92:      }
    93:      return result === 'success';
    94:    } finally {
    95:      setIsBusy(false);
    96:    }
    97:  };
    98:
    99:  const handleHandover = async (reason: string) => {
    100:    setIsBusy(true);
    101:    try {
    102:      return (await endShift(reason)) === 'success';
    103:    } finally {
    104:      setIsBusy(false);
    105:    }
    106:  };
    107:
    108:  const clock = getPhilippineClock(new Date());
    109:  const minutesUntilEnd = shiftSchedule && clock.date === shiftSchedule.date
    110:    ? Number(shiftSchedule.end_time.slice(0, 2)) * 60 + Number(shiftSchedule.end_time.slice(3))
    111:      - Number(clock.time.slice(0, 2)) * 60 - Number(clock.time.slice(3))
    112:    : null;
    113:  const shouldShowDutyAction = isShiftStatusReady && !shiftHoursLocked && attendanceStatus !== 'absent' && attendanceStatus !== 'on_leave';
    114:  const shouldShowLateCheckIn = isShiftStatusReady && !shiftHoursLocked && attendanceStatus === 'absent' && isLateCheckInApproved;
    115:  const shouldShowAbsenceReport = isShiftStatusReady && !hasOpenShift && attendanceStatus === null;
    116:  const shouldShowShiftControls = isShiftStatusReady && hasOpenShift && !shiftHoursLocked;
    117:
    118:  return (
    119:    <>
    120:      <View testID="shift-control-card" style={styles.card}>
    121:        <View style={styles.headingRow}>
    122:          <View style={styles.headingIcon}>
    123:            <MaterialIcons name="work-outline" size={18} color="#164E63" />
    124:          </View>
    125:          <Text style={styles.heading}>Shift today</Text>
    126:          <View style={[styles.statusBadge, hasOpenShift && (isOnDuty ? styles.onlineBadge : styles.offlineBadge)]}>
    127:            {hasOpenShift && <View style={[styles.statusDot, isOnDuty ? styles.onlineDot : styles.offlineDot]} />}
    128:            <Text style={[styles.statusText, hasOpenShift && (isOnDuty ? styles.onlineText : styles.offlineText)]}>{statusLabel}</Text>
    129:          </View>
    130:        </View>
    131:
    132:        {hasOpenShift && startTime && (
    133:          <View style={styles.startTimeRow}>
    134:            <MaterialIcons name="schedule" size={16} color="#64748B" />
    135:            <Text style={styles.startTimeText}>Started {startTime}</Text>
    136:          </View>
    137:        )}
    138:        {isShiftStatusReady && shiftHoursLocked && <View style={styles.startTimeRow}>
    139:          <MaterialIcons name="lock-outline" size={16} color="#92400E" />
    140:          <Text style={styles.startTimeText}>{lastEndSource === 'scheduled' ? 'Shift ended automatically. ' : 'Shift hours are closed. '}{nextShiftStartAt ? `Next start: ${nextShiftStartAt.replace(' ', ' at ')}` : 'Check back for your next shift.'}</Text>
    141:        </View>}
    142:        {isShiftStatusReady && hasOpenShift && !shiftHoursLocked && minutesUntilEnd !== null && minutesUntilEnd > 0 && minutesUntilEnd <= 30 && <Text style={styles.startTimeText}>Your shift ends automatically in {minutesUntilEnd} minute{minutesUntilEnd === 1 ? '' : 's'}.</Text>}
    143:        {isShiftStatusReady && attendanceStatus === 'absent' && !isLateCheckInApproved && <Text style={styles.startTimeText}>Your attendance is marked absent. Contact Admin if you need to check in late.</Text>}
    144:        {isShiftStatusReady && shouldShowLateCheckIn && <Text style={styles.startTimeText}>Admin approved your late check-in. Checking in records attendance but does not put you On Duty.</Text>}
    145:
    146:        {shouldShowAbsenceReport && (
    147:          <Pressable
    148:            accessibilityRole="button"
    149:            accessibilityLabel="Report absence or leave"
    150:            disabled={isBusy}
    151:            onPress={() => setShowAttendanceReport(true)}
    152:            style={({ pressed }) => [styles.absenceButton, pressed && styles.pressed]}
    153:          >
    154:            <MaterialIcons name="event-busy" size={16} color="#475569" />
    155:            <Text style={styles.absenceButtonText}>Report absence or leave</Text>
    156:          </Pressable>
    157:        )}
    158:
    159:        {shouldShowLateCheckIn && (
    160:          <View style={styles.actionsRow}>
    161:            <Pressable
    162:              accessibilityRole="button"
    163:              accessibilityLabel="Check in late"
    164:              accessibilityHint="Record your actual late check-in. This does not place you On Duty."
    165:              disabled={isBusy}
    166:              onPress={() => void handleLateCheckIn()}
    167:              style={({ pressed }) => [styles.availabilityButton, styles.onDutyButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
    168:            >
    169:              {isBusy ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="login" size={18} color="#FFFFFF" />}
    170:              <Text style={styles.onDutyButtonText}>{isBusy ? 'Checking inâ€¦' : 'Check in â€” late'}</Text>
    171:            </Pressable>
    172:          </View>
    173:        )}
    174:
    175:        {shouldShowDutyAction && (
    176:          <View style={styles.actionsRow}>
    177:            <Pressable
    178:              accessibilityRole="button"
    179:              accessibilityLabel={isOnDuty ? 'Pause availability' : 'On Duty'}
    180:              accessibilityHint={isOnDuty ? 'Pause new delivery requests. Your shift stays open; use End shift to record your end time.' : 'Record attendance and become available for delivery requests.'}
    181:              disabled={isBusy}
    182:              onPress={() => void handleToggleAvailability()}
    183:              android_ripple={{ color: 'rgba(15, 118, 110, 0.12)' }}
    184:              style={({ pressed }) => [styles.availabilityButton, !isOnDuty && styles.onDutyButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
    185:            >
    186:              {isBusy ? <ActivityIndicator color={isOnDuty ? '#0F766E' : '#FFFFFF'} /> : <MaterialIcons name={isOnDuty ? 'wifi-off' : 'wifi'} size={18} color={isOnDuty ? '#0F766E' : '#FFFFFF'} />}
    187:              <Text style={[styles.availabilityButtonText, !isOnDuty && styles.onDutyButtonText]}>{isOnDuty ? 'Pause availability' : 'On Duty'}</Text>
    188:            </Pressable>
    189:            {shouldShowShiftControls && <Pressable
    190:              accessibilityRole="button"
    191:              accessibilityLabel="End shift"
    192:              accessibilityHint="Close your work shift and record your end time."
    193:              disabled={isBusy}
    194:              onPress={() => activeTaskCount > 0 ? setShowHandover(true) : setShowShiftEnd(true)}
    195:              android_ripple={{ color: 'rgba(180, 35, 24, 0.1)' }}
    196:              style={({ pressed }) => [styles.endShiftButton, pressed && styles.pressed, isBusy && styles.disabledButton]}
    197:            >
    198:              <MaterialIcons name="stop-circle" size={18} color="#B42318" />
    199:              <Text style={styles.endShiftButtonText}>End shift</Text>
    200:            </Pressable>}
    201:          </View>
    202:        )}
    203:        {shouldShowShiftControls && isOnDuty && <Text style={styles.startTimeText}>Pausing availability keeps your shift open. Use End shift to record your end time.</Text>}
    204:      </View>
    205:
    206:      <HandoverModal
    207:        visible={showHandover}
    208:        onClose={() => setShowHandover(false)}
    209:        onConfirm={handleHandover}
    210:        taskCount={activeTaskCount}
    211:      />
    212:      <ShiftEndModal
    213:        visible={showShiftEnd}
    214:        onClose={() => setShowShiftEnd(false)}
    215:        onConfirm={handleEndShift}
    FILE mobile-app/services/apiService.ts L160-L205
    160:
    161:export const markNotificationAsRead = async (notificationId: string) => {
    162:  return api.put(`/api/notifications/${notificationId}/read`);
    163:};
    164:
    165:export const markAllNotificationsAsRead = async (userId: string) => {
    166:  return api.put(`/api/notifications/read-all/${userId}`);
    167:};
    168:
    169:export const updateDutyStatus = async (userId: string, is_on_duty: boolean) => {
    170:  return api.post(`/api/users/${userId}/duty`, { is_on_duty });
    171:};
    172:
    173:export const endShift = async (userId: string, operation_id: string, reason?: string) => {
    174:  return api.post(`/api/users/${userId}/shift/end`, { operation_id, reason });
    175:};
    176:
    177:export const submitAttendance = async (userId: string, status: 'present' | 'absent' | 'on_leave', reason?: string, operation_id?: string) => {
    178:  const response = await api.post(`/api/users/${userId}/attendance`, { status, reason, operation_id });
    179:  if (status === 'present' && (!response.data?.success || !response.data?.session?.start_time)) {
    180:    throw new Error('The server did not confirm your shift start. Please try again.');
    181:  }
    182:  return response;
    183:};
    184:
    185:export const getMyShiftSession = async () => (await api.get('/api/users/me/shift-session')).data;
    186:
    187:export const getMyAttendance = async () => {
    188:  const res = await api.get('/api/users/me/attendance');
    189:  return res.data; // { status: 'absent' | 'present' | 'on_leave' | null }
    190:};
    191:
    192:export const updateLocationBackground = async (data: {
    193:  riderId: string;
    194:  lat: number;
    195:  lng: number;
    196:  requestId: string;
    197:  heading?: number | null;
    198:  accuracy?: number | null;
    199:  timestamp?: number;
    200:  batteryLevel?: number;
    201:  networkType?: string;
    202:}) => {
    203:  try {
    204:    return await api.post('/api/users/location', data);
    205:  } catch (err: any) {
    FILE mobile-app/app/(tabs)/_layout.tsx L1-L65
    1:import React from 'react';
    2:import { Tabs } from 'expo-router';
    3:import { Platform, StyleSheet, View } from 'react-native';
    4:import { useSafeAreaInsets } from 'react-native-safe-area-context';
    5:import { useQuery } from '@tanstack/react-query';
    6:import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
    7:import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
    8:import { Colors } from '@/constants/Colors';
    9:import { useColorScheme } from '@/hooks/use-color-scheme';
    10:import { useAuth } from '@/context/AuthContext';
    11:import { useLocation } from '@/context/LocationContext';
    12:import { AttendanceLockout } from '@/components/AttendanceLockout';
    13:import { useDashboard } from '@/hooks/data/useDashboard';
    14:import { getTasks } from '@/services/apiService';
    15:import { getRiderTaskCounts } from '@/utils/taskFilters';
    16:import { useMessagingUnread } from '@/hooks/useMessagingUnread';
    17:import { TodayRoadBackdrop } from '@/components/navigation/TodayRoadBackdrop';
    18:
    19:export default function TabLayout() {
    20:  const colorScheme = useColorScheme();
    21:  const insets = useSafeAreaInsets();
    22:  const { user } = useAuth();
    23:  const { attendanceStatus, hasOpenShift, isOnDuty, isShiftStatusReady, isNetworkReachable } = useLocation();
    24:  const { handleLogout } = useDashboard();
    25:  const unreadMessages = useMessagingUnread();
    26:
    27:  const { data: tasks = [] } = useQuery({
    28:    queryKey: ['tasks', user?.id],
    29:    queryFn: () => getTasks(user!.id),
    30:    enabled: !!user?.id,
    31:    refetchInterval: 30000,
    32:  });
    33:
    34:  const counts = getRiderTaskCounts(isShiftStatusReady && hasOpenShift && isOnDuty && isNetworkReachable !== false ? tasks : []);
    35:
    36:  if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
    37:    return (
    38:      <AttendanceLockout
    39:        status={attendanceStatus as any}
    40:        onLogout={handleLogout}
    41:      />
    42:    );
    43:  }
    44:
    45:  return (
    46:    <View style={styles.tabLayout}>
    47:      <TodayRoadBackdrop />
    48:      <Tabs
    49:        initialRouteName="index"
    50:        tabBar={props => (
    51:          <FloatingTabBar
    52:            {...props}
    53:            badgeCounts={{
    54:              overdue: counts.overdue,
    55:              tomorrow: counts.upcoming,
    56:              index: counts.today,
    57:              inbox: unreadMessages,
    58:            }}
    59:          />
    60:        )}
    61:        screenOptions={{
    62:          tabBarActiveTintColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint,
    63:          headerShown: false,
    64:          sceneStyle: { backgroundColor: 'transparent' },
    65:          tabBarStyle: Platform.select({
    server\scripts\2026-10-22-weekday-auto-absence.sql:3:  ADD COLUMN auto_absent_at DATETIME NULL,
    server\routes\shiftSchedule.ts:47:      WHERE DATE(ss.start_time)=? AND ss.end_source='scheduled' AND ss.active_task_count_at_end>0
    server\routes\users.ts:130:             al.absence_source, al.auto_absent_at, al.late_checkin_approved_by,
    server\routes\users.ts:188:      riderId, type: 'attendance', status: 'absent', absence_source: 'automatic_no_show',
    server\routes\users.ts:210:      `SELECT status, reason, absence_source, auto_absent_at, late_checkin_approved_by, late_checkin_approved_at FROM attendance_logs WHERE rider_id = ? AND date = ${PH_TODAY_SQL} LIMIT 1`,
    server\routes\users.ts:346:        console.error(`[SimSweep] Failed to close shift for ${rider.id}:`, sweepError);
    server\routes\users.ts:363:    if (rows[0]?.absence_source === 'automatic_no_show') {
    server\routes\users.ts:364:      return res.status(409).json({ error: 'Use Approve late check-in to authorize a rider with an automatic no-show.' });
    server\routes\users.ts:539:      const [recent]: any = await pool.query("SELECT * FROM shift_sessions WHERE rider_id=? AND end_source='scheduled' AND DATE(start_time)=? ORDER BY end_time DESC LIMIT 1", [id, access.policy.date]);
    server\services\shiftCutoff.ts:34:    await conn.query(`UPDATE shift_sessions SET end_time=?, session_state='closed', end_source='scheduled',
    server\services\shiftCutoff.ts:35:      scheduled_cutoff_at=?, end_operation_id=?, handover_reason='Scheduled shift cutoff', active_task_count_at_end=?
    server\services\shiftCutoff.ts:94:        (id, rider_id, date, status, reason, absence_source, auto_absent_at)
    server\services\shiftCutoff.ts:95:        VALUES (?, ?, ?, 'absent', ?, 'automatic_no_show', ?)`, [
    server\services\shiftCutoff.ts:97:        'Automatic no-show after the 15-minute shift-start grace period.',
    server\services\shiftCutoff.ts:114:        id: `notif_auto_absent_${rider.id}_${date}`,
    server\services\shiftCutoff.ts:120:        status: 'absent', absence_source: 'automatic_no_show', date,
    server\services\shiftCutoff.ts:122:      io?.to(rider.id).emit('attendance-updated', { status: 'absent', absence_source: 'automatic_no_show', date });
    server\services\shiftSchedule.ts:72:      AND COLUMN_NAME IN ('absence_source', 'auto_absent_at', 'late_checkin_approved_by', 'late_checkin_approved_at')`);
    server\services\shiftSchedule.ts:77:  if (!existingAttendanceColumns.has('auto_absent_at')) {
    server\services\shiftSchedule.ts:78:    await db.query('ALTER TABLE attendance_logs ADD COLUMN auto_absent_at DATETIME NULL');
    server\services\shiftSessions.ts:33:        && attendance.absence_source === 'automatic_no_show'
    server\services\shiftSessions.ts:97:    const [closed] = await conn.query('SELECT * FROM shift_sessions WHERE id = ?', [open[0].id]);
    server\services\shiftSessions.ts:128:    if (attendance?.status !== 'absent' || attendance.absence_source !== 'automatic_no_show' || attendance.late_checkin_approved_at) {
    server\services\shiftSessions.ts:129:      throw new ShiftSessionError('LATE_CHECKIN_NOT_ELIGIBLE', 'Only an unapproved automatic no-show can be approved for late check-in.');
    server\services\shiftSessions.ts:132:      WHERE rider_id=? AND date=? AND status='absent' AND absence_source='automatic_no_show' AND late_checkin_approved_at IS NULL`,
    server\services\shiftSessions.ts:165:  const [rows] = await db.query(`SELECT *, CASE WHEN session_state = 'closed' AND end_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE,start_time,end_time) ELSE NULL END AS duration_minutes FROM shift_sessions WHERE rider_id=? AND DATE(start_time)=? ORDER BY start_time ASC`, [riderId, date]);
    server\routes\__tests__\attendance-daily.test.ts:61:      status: 'absent', absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
    server\routes\__tests__\attendance-daily.test.ts:70:      absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
    server\routes\__tests__\attendance-daily.test.ts:94:  it('does not let admins clear an automatic no-show in place of explicit approval', async () => {
    server\routes\__tests__\attendance-daily.test.ts:95:    poolQuery.mockResolvedValueOnce([[{ absence_source: 'automatic_no_show' }]]);
    server\services\__tests__\shiftSchedule.test.ts:27:    expect(alters.join('\n')).toContain('auto_absent_at');
    server\services\__tests__\shiftSchedule.test.ts:33:    const existing = new Set(['absence_source', 'auto_absent_at']);
    server\services\__tests__\shiftCutoff.test.ts:4:describe('scheduled shift cutoff', () => {
    server\services\__tests__\shiftCutoff.test.ts:5:  it('closes an open shift at 19:00 with unfinished tasks and is safe to retry', async () => {
    server\services\__tests__\shiftCutoff.test.ts:20:    expect(query).toHaveBeenCalledWith(expect.stringContaining("end_source='scheduled'"), expect.arrayContaining(['2026-10-22 19:00:00', 1, 'shift-1']));
    server\services\__tests__\shiftCutoff.test.ts:123:    expect(emit).toHaveBeenCalledWith('attendance-updated', expect.objectContaining({ status: 'absent', absence_source: 'automatic_no_show' }));
    server\services\__tests__\shiftSessions.test.ts:91:          : sql.includes('SELECT id, status, absence_source') ? [[{ id: 'att-1', status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: null }]]
    server\services\__tests__\shiftSessions.test.ts:106:            ? [[{ id: 'att-1', status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-22 08:20:00' }]]
    server\services\__tests__\shiftSessions.test.ts:123:        ? [[{ status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: null }]]
    server\services\__tests__\shiftSessions.test.ts:150:        ? [[{ status: 'absent', absence_source: 'automatic_no_show', late_checkin_approved_at: '2026-10-22 08:20:00' }]]
    ✓ • 278ms

## Activity

    $ $files=@('server/services/shiftCutoff.ts','server/services/shiftSchedule.ts','server/index.ts','src/app/App.tsx','src/app/routes.tsx'); foreach($f in $files){Write-Output "FILE $f"; if(Test-Path $f){rg -n "setInterval|sweep|cutoff|grace|schedule|role|AttendanceDashboard|login|admin|route" $f}}; $lines=Get-Content server/services/shiftCutoff.ts; for($i=1;$i -le [Math]::Min(145,$lines.Length);$i++){"$i`:$($lines[$i-1])"}
    FILE server/services/shiftCutoff.ts
    24:    const schedule = await getScheduleForDate(conn, date);
    25:    if (!schedule) { await conn.commit(); return null; }
    26:    const cutoffAt = `${date} ${schedule.end_time}:00`;
    27:    if (now.getTime() < Date.parse(`${date}T${schedule.end_time}:00+08:00`)) {
    33:    const operationId = `scheduled_${session.id}`;
    34:    await conn.query(`UPDATE shift_sessions SET end_time=?, session_state='closed', end_source='scheduled',
    35:      scheduled_cutoff_at=?, end_operation_id=?, handover_reason='Scheduled shift cutoff', active_task_count_at_end=?
    36:      WHERE id=? AND session_state='open'`, [cutoffAt, cutoffAt, operationId, tasks.length, session.id]);
    38:    await conn.query('UPDATE attendance_logs SET off_duty_time=? WHERE rider_id=? AND date=?', [cutoffAt, riderId, date]);
    42:      `move_${crypto.randomUUID()}`, riderId, 'duty_off', 'Shift ended at scheduled cutoff',
    43:      JSON.stringify({ source: 'scheduled', active_task_count: tasks.length }), cutoffAt,
    46:    return { ...session, end_time: cutoffAt, session_state: 'closed', end_source: 'scheduled', active_task_count_at_end: tasks.length };
    71:  const schedule = await getScheduleForDate(db, date);
    72:  if (!schedule) return 0;
    73:  const deadlineMs = Date.parse(`${date}T${schedule.start_time}:00+08:00`) + 15 * 60_000;
    78:  const [riders] = await db.query("SELECT id, name FROM users WHERE role = 'rider'");
    97:        'Automatic no-show after the 15-minute shift-start grace period.',
    112:      const message = `${rider.name || 'Rider'} was automatically marked absent after missing the shift-start grace period.`;
    113:      io?.to('admin-room').emit('notification-added', {
    118:      io?.to('admin-room').emit('rider-status-updated', {
    141:  const timer = setInterval(() => void run(), 60_000);
    FILE server/services/shiftSchedule.ts
    17:  cutoffAt: string | null;
    53:  await db.query(`CREATE TABLE IF NOT EXISTS shift_schedule_revisions (
    62:      AND COLUMN_NAME IN ('end_source', 'scheduled_cutoff_at')`);
    67:  if (!existing.has('scheduled_cutoff_at')) {
    68:    await db.query('ALTER TABLE shift_sessions ADD COLUMN scheduled_cutoff_at DATETIME NULL');
    90:    start_time, end_time, actor_id, created_at FROM shift_schedule_revisions
    97:    start_time, end_time, actor_id, created_at FROM shift_schedule_revisions
    104:  const schedule = await getScheduleForDate(db, date);
    105:  if (!schedule) return {
    106:    date, startTime: null, endTime: null, cutoffAt: null,
    109:  const window = evaluateShiftWindow(time, schedule.start_time, schedule.end_time);
    111:  const nextSchedule = window === 'early' ? schedule : (await getScheduleForDate(db, nextDate)) || schedule;
    113:    date, startTime: schedule.start_time, endTime: schedule.end_time,
    114:    cutoffAt: `${date} ${schedule.end_time}:00`,
    124:  await db.query(`INSERT INTO shift_schedule_revisions (effective_date,start_time,end_time,actor_id)
    128:    start_time, end_time, actor_id, created_at FROM shift_schedule_revisions WHERE effective_date=?`, [effectiveDate]);
    FILE server/index.ts
    15:import authRoutes from './routes/auth';
    16:import requestRoutes from './routes/requests';
    17:import riderTaskRoutes from './routes/riderTasks';
    18:import notificationRoutes from './routes/notifications';
    19:import conversationRoutes, { resolveRequestConversation } from './routes/conversations';
    20:import userRoutes from './routes/users';
    21:import shiftScheduleRoutes from './routes/shiftSchedule';
    22:import analyticsRoutes from './routes/analytics';
    23:import routingRoutes from './routes/routing';
    99:// Standard Security Practice: Rate limiting for Authentication routes
    102:  max: 10, // Limit each IP to 10 login attempts per window
    103:  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    107:app.use('/api/auth/login', authRateLimiter);
    169:    setInterval(() => this.check(), 30000);
    196:          // Notify admins
    197:          const [admins] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
    200:          for (const admin of admins) {
    205:              [admin.id, req.request_id],
    212:              [notifId, admin.id, notifMessage, 'request_submitted', req.request_id]
    215:              id: notifId, user_id: admin.id, message: notifMessage,
    218:            this.io.to(admin.id).emit('notification-added', {
    219:              id: notifId, user_id: admin.id, message: notifMessage,
    225:          this.io.to('admin-room').to(req.requester_id).emit('request-updated', { request_id: req.request_id, status: 'pending' });
    276:        const gracePeriod = 120000; // 2 minutes
    279:        // AND grace period has passed
    281:        if (req.assigned_rider_id && !isOnline && timeSinceUpdate > gracePeriod) {
    361:          this.io.to('admin-room')
    377:  if (socket.user?.role === 'rider' && socket.user.id) {
    386:    const isAdminRoom = room === 'admin-room';
    388:    if (socket.user.role === 'admin' || (isAdminRoom && socket.user.role === 'personnel')) {
    390:      if (room === 'admin-room') {
    423:        if (isAssignedRider || isRequester || socket.user.role === 'personnel') {
    436:    // Default: block unknown rooms for non-admins
    462:    if (userID !== socket.user.id && socket.user.role !== 'admin') {
    491:    if (riderId !== socket.user.id && socket.user.role !== 'admin') {
    496:      if (socket.user.role === 'rider' && riderId === socket.user.id) {
    515:        refreshPresence: socket.user.role === 'rider' && riderId === socket.user.id,
    530:        // during the grace period (e.g. page refresh)
    545:app.use('/api/shift-schedule', authenticate, shiftScheduleRoutes);
    FILE src/app/App.tsx
    1:import { RouterProvider } from 'react-router';
    7:import { router } from './routes';
    15:            <RouterProvider router={router} />
    FILE src/app/routes.tsx
    1:import { createBrowserRouter, Navigate } from "react-router";
    9:export const router = createBrowserRouter([
    15:    path: "/admin/dashboard",
    17:      <ProtectedRoute allowedRoles={["admin"]}>
    23:    path: "/admin/tracking/:id",
    25:      <ProtectedRoute allowedRoles={["admin", "personnel"]}>
    65:      <ProtectedRoute allowedRoles={["personnel", "admin"]}>
    1:import crypto from 'crypto';
    2:import { pool } from '../db';
    3:import { getPhilippineDateTime, getScheduleForDate } from './shiftSchedule';
    4:
    5:type Db = { query: (sql: string, values?: any[]) => Promise<any>; getConnection: () => Promise<any> };
    6:type RealtimeIo = { to: (room: string) => { emit: (event: string, payload: any) => void } };
    7:
    8:function shiftDate(startTime: string): string {
    9:  return String(startTime).slice(0, 10);
    10:}
    11:
    12:export async function reconcileRiderCutoff(db: Db, riderId: string, now: Date = new Date()): Promise<any | null> {
    13:  const [candidate] = await db.query("SELECT id FROM shift_sessions WHERE rider_id=? AND session_state='open' LIMIT 1", [riderId]);
    14:  if (!candidate[0]) return null;
    15:  const conn = await db.getConnection();
    16:  try {
    17:    await conn.beginTransaction();
    18:    const [riders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [riderId]);
    19:    if (!riders[0]) { await conn.commit(); return null; }
    20:    const [sessions] = await conn.query("SELECT * FROM shift_sessions WHERE rider_id = ? AND session_state = 'open' ORDER BY start_time DESC LIMIT 1 FOR UPDATE", [riderId]);
    21:    const session = sessions[0];
    22:    if (!session) { await conn.commit(); return null; }
    23:    const date = shiftDate(session.start_time);
    24:    const schedule = await getScheduleForDate(conn, date);
    25:    if (!schedule) { await conn.commit(); return null; }
    26:    const cutoffAt = `${date} ${schedule.end_time}:00`;
    27:    if (now.getTime() < Date.parse(`${date}T${schedule.end_time}:00+08:00`)) {
    28:      await conn.commit(); return null;
    29:    }
    30:
    31:    const [tasks] = await conn.query(`SELECT request_id FROM delivery_requests WHERE assigned_rider_id = ?
    32:      AND status = 'approved' AND COALESCE(delivery_status, '') NOT IN ('completed','delivered','failed','cancelled','disapproved')`, [riderId]);
    33:    const operationId = `scheduled_${session.id}`;
    34:    await conn.query(`UPDATE shift_sessions SET end_time=?, session_state='closed', end_source='scheduled',
    35:      scheduled_cutoff_at=?, end_operation_id=?, handover_reason='Scheduled shift cutoff', active_task_count_at_end=?
    36:      WHERE id=? AND session_state='open'`, [cutoffAt, cutoffAt, operationId, tasks.length, session.id]);
    37:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [riderId]);
    38:    await conn.query('UPDATE attendance_logs SET off_duty_time=? WHERE rider_id=? AND date=?', [cutoffAt, riderId, date]);
    39:    await conn.query('INSERT INTO shift_operation_receipts (id,rider_id,operation_id,operation_kind,session_id) VALUES (?,?,?,?,?)',
    40:      [`shift_op_${crypto.randomUUID()}`, riderId, operationId, 'end', session.id]);
    41:    await conn.query('INSERT INTO movement_events (id,rider_id,event_type,message,metadata,timestamp) VALUES (?,?,?,?,?,?)', [
    42:      `move_${crypto.randomUUID()}`, riderId, 'duty_off', 'Shift ended at scheduled cutoff',
    43:      JSON.stringify({ source: 'scheduled', active_task_count: tasks.length }), cutoffAt,
    44:    ]);
    45:    await conn.commit();
    46:    return { ...session, end_time: cutoffAt, session_state: 'closed', end_source: 'scheduled', active_task_count_at_end: tasks.length };
    47:  } catch (error) {
    48:    await conn.rollback();
    49:    throw error;
    50:  } finally { conn.release(); }
    51:}
    52:
    53:export async function reconcileDueCutoffs(db: Db = pool, now: Date = new Date()): Promise<number> {
    54:  const [rows] = await db.query("SELECT DISTINCT rider_id FROM shift_sessions WHERE session_state='open'");
    55:  let closed = 0;
    56:  for (const row of rows as Array<{ rider_id: string }>) {
    57:    try {
    58:      if (await reconcileRiderCutoff(db, row.rider_id, now)) closed++;
    59:    } catch (error) {
    60:      console.error(`[SHIFT CUTOFF] Failed for rider ${row.rider_id}:`, error);
    61:    }
    62:  }
    63:  return closed;
    64:}
    65:
    66:export async function reconcileDueAutoAbsences(db: Db = pool, now: Date = new Date(), io?: RealtimeIo): Promise<number> {
    67:  const { date } = getPhilippineDateTime(now);
    68:  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    69:  if (weekday === 0 || weekday === 6) return 0;
    70:
    71:  const schedule = await getScheduleForDate(db, date);
    72:  if (!schedule) return 0;
    73:  const deadlineMs = Date.parse(`${date}T${schedule.start_time}:00+08:00`) + 15 * 60_000;
    74:  if (!Number.isFinite(deadlineMs) || now.getTime() < deadlineMs) return 0;
    75:  const deadlineLocal = getPhilippineDateTime(new Date(deadlineMs));
    76:  const autoAbsentAt = `${deadlineLocal.date} ${deadlineLocal.time}:00`;
    77:
    78:  const [riders] = await db.query("SELECT id, name FROM users WHERE role = 'rider'");
    79:  let created = 0;
    80:  for (const rider of riders as Array<{ id: string; name: string }>) {
    81:    let conn: any;
    82:    let shouldNotify = false;
    83:    try {
    84:      conn = await db.getConnection();
    85:      await conn.beginTransaction();
    86:      const [lockedRiders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [rider.id]);
    87:      if (!lockedRiders[0]) { await conn.commit(); continue; }
    88:      const [attendance] = await conn.query(
    89:        'SELECT status FROM attendance_logs WHERE rider_id = ? AND date = ? LIMIT 1 FOR UPDATE',
    90:        [rider.id, date],
    91:      );
    92:      if (attendance[0]) { await conn.commit(); continue; }
    93:      await conn.query(`INSERT INTO attendance_logs
    94:        (id, rider_id, date, status, reason, absence_source, auto_absent_at)
    95:        VALUES (?, ?, ?, 'absent', ?, 'automatic_no_show', ?)`, [
    96:        `att_${crypto.randomUUID()}`, rider.id, date,
    97:        'Automatic no-show after the 15-minute shift-start grace period.',
    98:        autoAbsentAt,
    99:      ]);
    100:      await conn.commit();
    101:      created++;
    102:      shouldNotify = true;
    103:    } catch (error: any) {
    104:      await conn.rollback();
    105:      if (error?.code !== 'ER_DUP_ENTRY') {
    106:        console.error(`[AUTO ABSENCE] Failed for rider ${rider.id}:`, error);
    107:      }
    108:    } finally {
    109:      conn?.release();
    110:    }
    111:    if (shouldNotify) {
    112:      const message = `${rider.name || 'Rider'} was automatically marked absent after missing the shift-start grace period.`;
    113:      io?.to('admin-room').emit('notification-added', {
    114:        id: `notif_auto_absent_${rider.id}_${date}`,
    115:        message,
    116:        type: 'warning',
    117:      });
    118:      io?.to('admin-room').emit('rider-status-updated', {
    119:        riderId: rider.id, riderName: rider.name || 'Rider', type: 'attendance',
    120:        status: 'absent', absence_source: 'automatic_no_show', date,
    121:      });
    122:      io?.to(rider.id).emit('attendance-updated', { status: 'absent', absence_source: 'automatic_no_show', date });
    123:    }
    124:  }
    125:  return created;
    126:}
    127:
    128:export function startShiftCutoffWorker(db: Db = pool, io?: RealtimeIo): () => void {
    129:  let running = false;
    130:  const run = async () => {
    131:    if (running) return;
    132:    running = true;
    133:    try {
    134:      await reconcileDueCutoffs(db);
    135:      await reconcileDueAutoAbsences(db, new Date(), io);
    136:    }
    137:    catch (error) { console.error('[SHIFT CUTOFF] Worker failed:', error); }
    138:    finally { running = false; }
    139:  };
    140:  void run();
    141:  const timer = setInterval(() => void run(), 60_000);
    142:  return () => clearInterval(timer);
    143:}
    ✓ • 283ms

## Assistant

The current system separates three concepts that can look similar:

- Attendance: present, absent, or on leave.
- Availability: On Duty or paused/off duty.
- Shift session: the recorded start and end times used for worked hours.

```text
Rider logs in
   ↓
Status and schedule are synchronized
   ↓
Within scheduled hours?
   ├─ No → Shift controls and tasks remain locked
   └─ Yes
       ↓
Rider presses On Duty
       ↓
Attendance = Present
Shift session = Open
Availability = On Duty
       ↓
Rider may pause/resume availability
Shift remains open
       ↓
Rider presses End shift
       ↓
Shift session = Closed
Availability = Off Duty
End time and duration appear on Admin Attendance
```

## 1. Rider mobile-app flow

### Login

1. The rider enters their email and PIN/password.
2. The app calls `POST /api/auth/login`.
3. The server validates the password, account status, password-reset requirements, and applicable MFA rules.
4. A new rider login explicitly sets `users.is_on_duty = false`.
5. Mobile receives access and refresh tokens and stores them according to “Keep me signed in.”
6. The app opens the rider tabs and retrieves:

   - `GET /api/users/me/attendance`
   - `GET /api/users/me/shift-session`

This restores the real server-side attendance, open shift, availability, schedule, and shift-lock state.

Important: logging in does not start a shift or mark the rider present. It only authenticates the rider and starts them as unavailable/off duty. If an open shift already exists, it remains open, but the rider must press On Duty again to resume availability.

Relevant code: [auth.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/auth.ts:81), [AuthContext.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/mobile-app/context/AuthContext.tsx:91), [LocationContext.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/mobile-app/context/LocationContext.tsx:563).

### Starting the shift

The normal visible action is On Duty.

When the rider presses it:

1. The app calls `POST /api/users/:riderId/duty` with `is_on_duty: true`.
2. The server verifies:

   - The rider can update only their own account.
   - Current time is inside the configured shift hours.
   - Attendance is not already absent or on leave.

3. If no attendance exists, the server creates attendance as `present` with `check_in_time`.
4. If no open shift session exists, it creates one with:

   - `start_time`
   - `session_state = open`
   - A unique operation ID

5. `users.is_on_duty` becomes true.
6. The admin room receives real-time attendance/duty updates.
7. The mobile app unlocks the rider’s tasks and begins availability/location heartbeat behavior.

Therefore, pressing On Duty on the first use of the day effectively performs all three actions:

```text
Record Present → Open Shift → Become Available
```

Relevant code: [ShiftControlCard.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/mobile-app/components/ShiftControlCard.tsx:175), [users.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/users.ts:270), [shiftSessions.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/services/shiftSessions.ts:54).

### Pause availability

Once a shift is open, the On Duty button changes to Pause availability.

Pausing:

- Sets `is_on_duty = false`.
- Stops the rider from being considered available for new assignments.
- Does not close the shift.
- Does not record the end time.
- Keeps the original shift start time.

The rider can press On Duty again to resume availability inside the same open shift.

This is deliberately different from End shift.

### Absence or leave

Before starting a shift, the rider can select Report absence or leave.

This records either:

- `absent`, or
- `on_leave`

with an optional reason, and keeps the rider off duty. Once recorded, the mobile tabs are replaced by an attendance lockout screen.

The rider cannot change to absent/on leave while an open shift exists; they must end the shift first.

### Automatic no-show and late check-in

On weekdays, the server runs a worker every minute.

If a rider has not created any attendance record within 15 minutes after scheduled shift start:

1. Attendance becomes `absent`.
2. `absence_source` becomes `automatic_no_show`.
3. The rider app is locked out.
4. Admin receives an immediate notification.

The rider cannot override this absence directly. Admin must select Approve late check-in for that rider and today’s date.

After approval:

1. The rider receives a real-time update.
2. A Check in — late button becomes available.
3. Pressing it converts attendance to `present` and opens a shift.
4. The rider remains off duty initially.
5. The rider must separately press On Duty to become available.

Relevant code: [shiftCutoff.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/services/shiftCutoff.ts:66), [AttendanceDashboard.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/src/app/pages/Admin/AttendanceDashboard.tsx:221), [shiftSessions.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/services/shiftSessions.ts:116).

### Ending the shift

The End shift button appears whenever a shift session is open.

If the rider has no unfinished tasks:

1. A confirmation modal is shown.
2. The app calls `POST /api/users/:id/shift/end`.
3. The server closes the open session.
4. It records:

   - `end_time`
   - `session_state = closed`
   - attendance `off_duty_time`
   - `is_on_duty = false`

5. Admin receives immediate shift and duty updates.

If unfinished tasks exist:

1. The rider is shown the handover modal.
2. A handover reason is mandatory.
3. The server records the number of unfinished tasks and the reason.
4. Admin receives a warning notification.

The operation IDs make start/end requests safe to retry without creating duplicate sessions.

Relevant code: [ShiftControlCard.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/mobile-app/components/ShiftControlCard.tsx:189), [users.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/users.ts:527), [shiftSessions.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/services/shiftSessions.ts:82).

### Automatic end of shift

At the configured scheduled end time, the background worker automatically:

- Closes any remaining open shift.
- Uses the scheduled cutoff as its end time.
- Sets the rider off duty.
- Updates attendance `off_duty_time`.
- Records `end_source = scheduled`.
- Records unfinished-task count.
- Marks the handover reason as “Scheduled shift cutoff.”

The mobile app then shows “Shift ended automatically.”

## 2. Web-admin flow

### Admin login

1. Admin submits email/password through the web login.
2. The browser calls `POST /api/auth/login`.
3. Authentication uses HttpOnly access and refresh cookies.
4. Depending on the account, the login can require:

   - Password reset
   - MFA verification
   - Initial MFA setup

5. After authentication, role-protected routing sends the admin into the admin system.

The special `admin@company.com` account currently bypasses mandatory reset and MFA setup/login handling.

Relevant code: [AuthContext.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/src/app/context/AuthContext.tsx:71), [auth.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/auth.ts:109).

### Attendance monitoring

The Attendance dashboard calls:

`GET /api/users/attendance/daily?date=YYYY-MM-DD`

For every rider, it displays:

- Present, absent, on leave, or no report
- Current On Duty/Off Duty state
- Shift start and end
- All shift sessions for the selected date
- Total worked minutes
- Active task count
- Handover reason
- Automatic no-show information
- Late check-in approval information

It listens for `rider-status-updated` and `notification-added`, so login resets, attendance changes, availability changes, shift starts, and shift ends refresh without requiring a page reload.

Relevant code: [AttendanceDashboard.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/src/app/pages/Admin/AttendanceDashboard.tsx:110), [users.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/users.ts:123).

### Admin actions

Admin currently supervises attendance rather than directly starting or ending a rider’s shift.

Admin can:

- Approve a late check-in for an automatically absent rider.
- Clear a normal/self-reported absence after confirmation.
- Review recorded sessions, duration, active tasks, and handover reasons.

Admin cannot use Clear absence for an automatic no-show. That path requires the explicit Approve late check-in action, preserving an audit trail.

## Practical state sequence

| Rider action | Attendance | Shift | Availability |
|---|---|---|---|
| Login | Unchanged | Existing session preserved | Off duty |
| First On Duty | Present | Opened | On duty |
| Pause availability | Present | Still open | Off duty |
| Resume On Duty | Present | Same session | On duty |
| End shift | Present | Closed | Off duty |
| Report absent/leave | Absent/on leave | No open shift | Off duty |
| Approved late check-in | Present after rider checks in | Opened | Off duty until On Duty is pressed |
| Scheduled cutoff | Present | Automatically closed | Off duty |

## User

just make it simple flow, write here

## Assistant

### Rider Mobile App

Login → System checks attendance and shift schedule → Rider taps **On Duty** → Attendance becomes **Present** → Shift starts → Rider receives tasks → Rider may **Pause/Resume availability** without ending the shift → Rider taps **End Shift** → If tasks remain, rider provides a handover reason → Shift end time is recorded → Rider becomes **Off Duty**.

If the rider does not check in within 15 minutes of shift start:

**Automatically marked Absent** → Admin approves late check-in → Rider taps **Check in late** → Rider then taps **On Duty**.

### Web Admin

Admin Login → Open **Attendance Dashboard** → View each rider’s attendance, duty status, start time, end time, hours worked, and active tasks → Receive live updates when riders start, pause, or end shifts → Approve late check-ins or clear applicable absences → Review handover reasons and unfinished tasks.

At scheduled closing time, any remaining open rider shift is automatically ended by the system.

## User

firebase has a campaign notification feature that automatically send custom notifications right that can set specific day, hours and how many notifications to send right? can you tell me about it, planning to have that kind of feature to the system.

## Assistant

I’ll verify the current Firebase capabilities and limits from the official documentation, then translate them into a simple plan for this rider/admin system.

## Activity

    Searched the web for site:firebase.google.com/docs/cloud-messaging notification campaigns schedule recurring notifications Firebase console, site:support.google.com/firebase scheduled notification campaign recurring frequency Firebase, site:firebase.google.com/docs/in-app-messaging campaigns scheduling frequency limit

## Assistant

Yes. Firebase Cloud Messaging (FCM) can send custom push notifications immediately or at a scheduled date and time through the Firebase Notifications composer.

However, there is an important limitation:

- Firebase Console is good for one-time scheduled campaigns.
- It can target user segments, topics, app versions, languages, and other audiences.
- It supports notification title, message, image, custom data, expiration, and reporting.
- It is not a complete recurring scheduling system for rules such as “every weekday at 7:45 AM, three reminders, stop once the rider starts their shift.”

Firebase In-App Messaging supports start/end dates and per-device frequency limits, but those messages appear only while the user is using the app—not as normal background push notifications. [Firebase campaign documentation](https://firebase.google.com/docs/in-app-messaging/compose-campaign/)

For your system, I recommend building a Campaign Notifications page in the web admin and using Firebase only for delivery.

### Proposed admin flow

Admin → Notifications → Create Campaign → Enter title and message → Select recipients → Set schedule and frequency → Activate campaign.

Admin could configure:

- Recipients: all riders, selected riders, on-duty riders, absent riders, or riders with unfinished tasks
- Date range
- Specific weekdays
- Time in Philippine time
- One-time or recurring schedule
- Number of notifications
- Interval between reminders
- Deep link, such as Attendance, Today’s Tasks, or Inbox
- Stop conditions, such as “stop after rider starts shift”

Example:

```text
Campaign: Morning shift reminder
Recipients: Riders without attendance
Days: Monday–Friday
First notification: 7:45 AM
Repeat: Every 10 minutes
Maximum: 3 notifications
Stop when: Rider starts shift or reports absence
```

### Simple technical flow

```text
Admin creates campaign
        ↓
Campaign saved in your database
        ↓
Server scheduler checks due campaigns every minute
        ↓
Server finds eligible riders
        ↓
Firebase sends push notifications
        ↓
Delivery attempt is recorded
        ↓
Campaign stops after its limit or stop condition
```

You would likely need database tables for:

- `notification_campaigns`
- `campaign_recipients`
- `campaign_schedules`
- `campaign_deliveries`
- Existing rider FCM device tokens

This approach gives you exact control over days, hours, repetition counts, rider status conditions, audit history, and cancellation. Firebase handles delivery to Android/iOS, while your system owns the campaign rules. Firebase recommends the Admin SDK or HTTP v1 API when console campaigns are not flexible enough. [Firebase Notifications composer](https://firebase.google.com/docs/cloud-messaging/send/firebase-console)

## User

write a plan to implement it in our system

## Assistant

I’ll map this plan to the notification, FCM-token, admin routing, and background-worker pieces already in the repository, using the project graph first. Since this is feature design, I’m also using the brainstorming skill to structure the decisions before proposing implementation phases.

## Activity

    $ Get-Content -Raw 'C:\Users\63938\.codex\skills\brainstorming\SKILL.md'
    ---
    name: brainstorming
    description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
    ---
    
    # Brainstorming Ideas Into Designs
    
    Help turn ideas into fully formed designs and specs through natural collaborative dialogue.
    
    Start by classifying how much process the request needs, then work
    through your path: understand the context, refine the idea, present a
    design, and get your human partner's approval.
    
    ## Establish Shared Understanding
    
    The outcome of brainstorming is an understanding your human partner can
    recognize and correct, grounded in what they want to accomplish.
    
    1. **Discover intent.** Use the request and available context to identify
       the intended outcome, who it is for, and what success looks like. When
       that information is missing, ask one focused question about purpose or
       intended use before proposing features or an approach. Knowing the app
       genre does not tell you why your partner wants it. Gathering missing
       requirements does not ask them to authorize the task again.
    2. **Write back your understanding.** Summarize the intended outcome,
       relevant constraints, and success criteria in a short note your partner
       can assess. Separate what they said from assumptions. Invite correction
       and incorporate their answer before treating this as the design brief.
    3. **Carry intent into the design.** Preserve the agreed understanding in
       the selected path's design artifact: the written spec for architectural
       work, or the in-chat design/probe for bounded work and spikes. Check
       proposed features and technical choices against that understanding.
    
    When the request already supplies the purpose and constraints, reflect
    that understanding instead of asking the same questions again. Keep the
    note concise; its accuracy and the opportunity to correct it matter.
    
    <HARD-GATE>
    Before taking any implementation action, including invoking an
    implementation skill, writing product code, scaffolding, installing
    product dependencies, or creating an external project, complete the
    selected path's prerequisites:
    
    - Spike: the human partner approves the question and probe.
    - Bounded: the human partner approves the short in-chat design.
    - Architectural: the human partner reviews and approves the written spec,
      then reviews the written implementation plan and selects its execution
      method. Conversational design approval only permits writing the spec;
      written-spec approval only permits invoking writing-plans.
    
    A reply approves the stage actually presented. Approval of an idea or
    feature scope does not approve artifacts that do not exist yet. Resume
    at the earliest incomplete stage; do not turn one approval into permission
    to skip the rest of the selected path. Read-only project exploration is
    allowed while those prerequisites remain incomplete.
    </HARD-GATE>
    
    ## Three Paths
    
    Before your first question, classify the request and say the
    classification out loud â€” "this looks bounded, so I'll present a short
    design here rather than write a spec" â€” so your human partner can
    override it:
    
    - **Spike** â€” a feasibility question ("can we...", "is it possible...",
      "quick and dirty is fine") whose output is an answer, not code you
      keep. Present the question and what you'll try in 2-3 sentences, get
      a nod, then find out as cheaply as correctness allows. No design
      doc, no spec file. Report findings as a recommendation; anything you
      built stays labeled throwaway.
    - **Bounded** â€” a well-scoped change to code that already exists in
      this repo: a new flag, a small endpoint, a one-file fix.
      Understanding the kind of app is not enough â€” bounded means the flow
      you are changing is already here to read. If there is no existing
      flow to change, the task is not bounded. Ask the clarifying
      questions that matter, present a short design IN CHAT (a few
      sentences to a few short paragraphs), and STOP. Implementation
      starts only after your human partner says yes to that design â€” a
      bounded task's approval is as hard a gate as an architectural
      one. No spec file, no implementation plan document.
    - **Architectural** â€” new projects, new subsystems, changes that
      restructure how components fit together or alter interfaces others
      depend on. Follow the full process: questions, approaches, sectioned
      design, written spec, then the writing-plans skill.
    
    When in doubt between two paths, take the heavier one. The ratchet is
    one-way: hidden complexity discovered mid-task upgrades the path â€”
    stop, say so, and step up. Nothing downgrades mid-task.
    
    ## Anti-Pattern: "Too Simple To Need Approval"
    
    Every path ends with your human partner approving the required design
    before implementation. A bounded change may need only two sentences in
    chat. A new todo-list project is architectural and requires the written
    spec and planning handoffs. Scale the artifact to the selected path;
    complete that path's reviews before implementation.
    
    ## Red Flags
    
    | Thought | Reality |
    |---------|---------|
    | "This is too simple to need a design" | Follow the selected path: a bounded change gets a short chat design; an architectural change gets the written spec and planning handoffs. |
    | "I'll call it bounded and skip the spec" | Reaching for a label to skip work IS the doubt â€” take the heavier path. |
    | "It's bounded and the design is obvious â€” I'll start while they read it" | The gate is the approval, not the design's length. Present, then stop until you hear yes. |
    | "I understand this kind of app, so it's bounded" | Bounded measures the repo, not your familiarity. A new project has no existing flow â€” it is architectural. |
    | "The spike works, so I'll keep the code" | A spike's output is an answer. Keeping the code is a new request â€” classify it. |
    | "It grew, but I'm almost done â€” no need to re-classify" | Hidden complexity upgrades the path mid-task. Stop and say so. |
    | "They approved the spike, so the follow-up change is approved too" | Each task gets its own classification and its own approval. |
    
    ## Checklist
    
    Classify first, announce the path, then create a task for each item on
    your path and complete them in order.
    
    **Spike:**
    1. **Explore project context** â€” enough to frame the probe
    2. **Present question + probe plan** â€” 2-3 sentences
    3. **Get approval** â€” a nod is enough
    4. **Investigate** â€” as cheaply as correctness allows
    5. **Report findings** â€” a recommendation; label anything built as throwaway
    
    **Bounded:**
    1. **Explore project context** â€” check files, docs, recent commits
    2. **Ask clarifying questions** â€” one at a time, the ones that matter
    3. **Present short design in chat** â€” approach, files touched, testing
    4. **Get approval** â€” STOP and wait for an explicit yes; presenting the design and starting in the same breath is skipping the gate
    5. **Implement** â€” proceed with the normal development workflow (TDD applies); no plan document
    
    **Architectural:**
    1. **Explore project context** â€” check files, docs, recent commits
    2. **Offer the visual companion just-in-time** â€” NOT upfront. The first time a question would genuinely be clearer shown than described, offer it then (its own message); on approval its browser tab opens for you. If no visual question ever arises, never offer it. See the Visual Companion section below.
    3. **Ask clarifying questions** â€” one at a time, understand purpose/constraints/success criteria
    4. **Propose 2-3 approaches** â€” with trade-offs and your recommendation
    5. **Present design** â€” in sections scaled to their complexity, get user approval after each section
    6. **Write design doc** â€” save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit
    7. **Spec self-review** â€” quick inline check for placeholders, contradictions, ambiguity, scope (see below)
    8. **User reviews written spec** â€” ask user to review the spec file before proceeding
    9. **Transition to implementation** â€” invoke writing-plans skill to create implementation plan
    
    ## Process Flow
    
    ```dot
    digraph brainstorming {
        "Classify: spike / bounded / architectural" [shape=diamond];
        "Present question + probe (2-3 sentences)" [shape=box];
        "Ask clarifying questions (bounded)" [shape=box];
        "Present short design in chat" [shape=box];
        "Human approves?" [shape=diamond];
        "Investigate; report recommendation" [shape=doublecircle];
        "Implement via normal workflow (no plan doc)" [shape=doublecircle];
        "Explore project context" [shape=box];
        "Ask clarifying questions" [shape=box];
        "Propose 2-3 approaches" [shape=box];
        "Present design sections" [shape=box];
        "User approves design?" [shape=diamond];
        "Write design doc" [shape=box];
        "Spec self-review\n(fix inline)" [shape=box];
        "User reviews spec?" [shape=diamond];
        "Invoke writing-plans skill" [shape=doublecircle];
        "Hidden complexity? Upgrade path" [shape=box];
    
        "Classify: spike / bounded / architectural" -> "Present question + probe (2-3 sentences)" [label="spike"];
        "Classify: spike / bounded / architectural" -> "Ask clarifying questions (bounded)" [label="bounded"];
        "Classify: spike / bounded / architectural" -> "Explore project context" [label="architectural"];
        "Present question + probe (2-3 sentences)" -> "Human approves?";
        "Ask clarifying questions (bounded)" -> "Present short design in chat";
        "Present short design in chat" -> "Human approves?";
        "Human approves?" -> "Investigate; report recommendation" [label="spike: yes"];
        "Human approves?" -> "Implement via normal workflow (no plan doc)" [label="bounded: yes"];
        "Hidden complexity? Upgrade path" -> "Classify: spike / bounded / architectural";
        "Explore project context" -> "Ask clarifying questions";
        "Ask clarifying questions" -> "Propose 2-3 approaches";
        "Propose 2-3 approaches" -> "Present design sections";
        "Present design sections" -> "User approves design?";
        "User approves design?" -> "Present design sections" [label="no, revise"];
        "User approves design?" -> "Write design doc" [label="yes"];
        "Write design doc" -> "Spec self-review\n(fix inline)";
        "Spec self-review\n(fix inline)" -> "User reviews spec?";
        "User reviews spec?" -> "Write design doc" [label="changes requested"];
        "User reviews spec?" -> "Invoke writing-plans skill" [label="approved"];
    }
    ```
    
    **Terminal states are path-bound.** Architectural: the ONLY skill you
    invoke after brainstorming is writing-plans â€” never frontend-design,
    mcp-builder, or any other implementation skill. Bounded: after
    approval, implementation proceeds directly through the normal
    development workflow; no plan document. Spike: the terminal state is a
    reported recommendation.
    
    ## The Process
    
    The subsections below serve the bounded and architectural paths (a
    spike stops at "present the probe, get a nod"). Sections from
    **Exploring approaches** onward are architectural-path depth â€” for
    bounded work, context plus a few questions plus a short in-chat design
    is the whole process.
    
    **Understanding the idea:**
    
    - Check out the current project state first (files, docs, recent commits)
    - Before asking detailed questions, assess scope: if the request describes multiple independent subsystems (e.g., "build a platform with chat, file storage, billing, and analytics"), flag this immediately. Don't spend questions refining details of a project that needs to be decomposed first.
    - If the project is too large for a single spec, help the user decompose into sub-projects: what are the independent pieces, how do they relate, what order should they be built? Then brainstorm the first sub-project through the normal design flow. Each sub-project gets its own spec â†’ plan â†’ implementation cycle.
    - For appropriately-scoped projects, ask questions one at a time to refine the idea
    - Prefer multiple choice questions when possible, but open-ended is fine too
    - Only one question per message - if a topic needs more exploration, break it into multiple questions
    - Focus on understanding: purpose, constraints, success criteria
    
    **Exploring approaches:**
    
    - Propose 2-3 different approaches with trade-offs
    - Present options conversationally with your recommendation and reasoning
    - Lead with your recommended option and explain why
    - YAGNI ruthlessly - remove unnecessary features from every approach and design
    
    **Presenting the design:**
    
    - Once you believe you understand what you're building, present the design
    - Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
    - Ask after each section whether it looks right so far
    - Cover: architecture, components, data flow, error handling, testing
    - Be ready to go back and clarify if something doesn't make sense
    
    **Design for isolation and clarity:**
    
    - Break the system into smaller units that each have one clear purpose, communicate through well-defined interfaces, and can be understood and tested independently
    - For each unit, you should be able to answer: what does it do, how do you use it, and what does it depend on?
    - Can someone understand what a unit does without reading its internals? Can you change the internals without breaking consumers? If not, the boundaries need work.
    - Smaller, well-bounded units are also easier for you to work with - you reason better about code you can hold in context at once, and your edits are more reliable when files are focused. When a file grows large, that's often a signal that it's doing too much.
    
    **Working in existing codebases:**
    
    - Explore the current structure before proposing changes. Follow existing patterns.
    - Where existing code has problems that affect the work (e.g., a file that's grown too large, unclear boundaries, tangled responsibilities), include targeted improvements as part of the design - the way a good developer improves code they're working in.
    - Don't propose unrelated refactoring. Stay focused on what serves the current goal.
    
    ## After the Design (architectural path)
    
    **Documentation:**
    
    - Write the validated design (spec) to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
      - (User preferences for spec location override this default)
    - Use elements-of-style:writing-clearly-and-concisely skill if available
    - Commit the design document to git
    
    **Spec Self-Review:**
    After writing the spec document, look at it with fresh eyes:
    
    1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, or vague requirements? Fix them.
    2. **Internal consistency:** Do any sections contradict each other? Does the architecture match the feature descriptions?
    3. **Scope check:** Is this focused enough for a single implementation plan, or does it need decomposition?
    4. **Ambiguity check:** Could any requirement be interpreted two different ways? If so, pick one and make it explicit.
    
    Fix any issues inline. No need to re-review â€” just fix and move on.
    
    **User Review Gate:**
    After the spec review loop passes, ask the user to review the written spec before proceeding:
    
    > "Spec written and committed to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."
    
    Wait for the user's response. If they request changes, make them and re-run the spec review loop. Only proceed once the user approves.
    
    **Implementation:**
    
    - Invoke the writing-plans skill to create a detailed implementation plan
    - Do NOT invoke any other skill. writing-plans is the next step.
    
    ## Visual Companion
    
    A browser-based companion for showing mockups, diagrams, and visual options during brainstorming. Available as a tool â€” not a mode. Accepting the companion means it's available for questions that benefit from visual treatment; it does NOT mean every question goes through the browser.
    
    **Offering the companion (just-in-time):** Do NOT offer it upfront. Wait until a question would genuinely be clearer shown than told â€” a real mockup / layout / diagram question, not merely a UI *topic*. The first time that happens, offer it then, as its own message:
    > "This next part might be easier if I show you â€” I can put together mockups, diagrams, and comparisons in a browser tab as we go. It's still new and can be token-intensive. Want me to? I'll open it for you."
    
    **This offer MUST be its own message.** Only the offer â€” no clarifying question, summary, or other content. Wait for the user's response. If they accept, start the server with `--open` so their browser opens to the first screen automatically. If they decline, continue text-only and don't offer again unless they raise it.
    
    **Per-question decision:** Even after the user accepts, decide FOR EACH QUESTION whether to use the browser or the terminal. The test: **would the user understand this better by seeing it than reading it?**
    
    - **Use the browser** for content that IS visual â€” mockups, wireframes, layout comparisons, architecture diagrams, side-by-side visual designs
    - **Use the terminal** for content that is text â€” requirements questions, conceptual choices, tradeoff lists, A/B/C/D text options, scope decisions
    
    A question about a UI topic is not automatically a visual question. "What does personality mean in this context?" is a conceptual question â€” use the terminal. "Which wizard layout works better?" is a visual question â€” use the browser.
    
    If they agree to the companion, read the detailed guide before proceeding:
    `skills/brainstorming/visual-companion.md`
    
    ✓ • 98ms

## Assistant

This is an architectural feature because it adds campaign storage, scheduling, targeting, delivery, admin UI, and audit reporting. I’m treating the goal as: admins can schedule one-time or recurring rider push campaigns, limit repetitions, target operational rider groups, and track results while Firebase remains the delivery channel. I’ll base the plan on the existing notification infrastructure and call out assumptions you can correct.

## Activity

    $ graphify query "How are Firebase push notifications currently registered, stored, sent, displayed, and managed by the mobile rider app, web admin, server routes, database, and background workers?"; rg -n --glob '!graphify-out/**' --glob '!mobile-admin/.expo/**' --glob '!coverage/**' "firebase|FCM|fcm_token|push token|push_token|sendEach|sendMulticast|notification" server mobile-app src shared | Select-Object -First 500
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Traversal: BFS depth=2 | Start: ['Rider mobile in-app and push experience', 'Admin-managed rider shift hours implementation plan', 'Admin-managed rider shift hours and automatic cutoff', 'ADMIN', 'App()', 'BackgroundMessagingClient', 'concurrently', 'Database rollout', 'firebaseMessagingClient.ts', 'Mobile Admin NativeWind Migration Design', 'notifications.ts', 'push()', '4. Sign in and confirm the phone registered for push', 'rider', 'routes.tsx', 'presentForegroundPushNotification()', 'serverIds', '.__restoreDefaultValues()', 'web', 'serviceWorkerSource'] | 462 nodes found
    
    NODE entry-5394e4b3b24662aa4aa133877b65a004.js [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L1 community=0]
    NODE s() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=6]
    NODE Codex conversation [src=codex-session-notification-feature.md loc=L1 community=1]
    NODE o() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=65]
    NODE cn() [src=src/app/components/ui/utils.ts loc=L4 community=9]
    NODE e() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=15]
    NODE p() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L2 community=87]
    NODE v() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=28]
    NODE _() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L15 community=21]
    NODE PersonnelV2Page.tsx [src=src/app/personnel-v2/PersonnelV2Page.tsx loc=L1 community=34]
    NODE index.ts [src=server/index.ts loc=L1 community=40]
    NODE utils.ts [src=src/app/components/ui/utils.ts loc=L1 community=43]
    NODE PersonnelDashboard.tsx [src=src/app/pages/PersonnelDashboard.tsx loc=L1 community=29]
    NODE index.ts [src=src/app/types/index.ts loc=L1 community=22]
    NODE requests.ts [src=server/routes/requests.ts loc=L1 community=81]
    NODE RequestDetailsPanel.tsx [src=src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx loc=L1 community=123]
    NODE AdminLayout.tsx [src=src/app/pages/Admin/AdminLayout.tsx loc=L1 community=17]
    NODE messaging.ts [src=server/services/messaging.ts loc=L1 community=53]
    NODE RiderDashboard.tsx [src=src/app/pages/RiderDashboard.tsx loc=L1 community=29]
    NODE _layout.tsx [src=mobile-app/app/_layout.tsx loc=L1 community=73]
    NODE Dashboard.tsx [src=src/app/pages/Dashboard.tsx loc=L1 community=17]
    NODE button.tsx [src=src/app/components/ui/button.tsx loc=L1 community=17]
    NODE LiveTrackingMap.tsx [src=src/app/components/LiveTrackingMap.tsx loc=L1 community=82]
    NODE users.ts [src=server/routes/users.ts loc=L1 community=171]
    NODE DeliveryRequest [src=src/app/types/index.ts loc=L155 community=22]
    NODE auth.ts [src=server/routes/auth.ts loc=L1 community=66]
    NODE useJobDetails.ts [src=mobile-app/hooks/data/useJobDetails.ts loc=L1 community=141]
    NODE Button [src=src/app/components/ui/button.tsx loc=L43 community=17]
    NODE notifications.ts [src=server/routes/notifications.ts loc=L1 community=75]
    NODE LiveTrackingDashboard.tsx [src=src/app/pages/LiveTrackingDashboard.tsx loc=L1 community=22]
    NODE DataContext.tsx [src=src/app/context/DataContext.tsx loc=L1 community=11]
    NODE useData() [src=src/app/context/DataContext.tsx loc=L783 community=11]
    NODE EnhancedBatchApproveModal.tsx [src=src/app/components/Admin/EnhancedBatchApproveModal.tsx loc=L1 community=17]
    NODE useAuth() [src=src/app/context/AuthContext.tsx loc=L186 community=17]
    NODE conversations.ts [src=server/routes/conversations.ts loc=L1 community=53]
    NODE db.ts [src=server/db.ts loc=L1 community=55]
    NODE pool [src=server/db.ts loc=L21 community=55]
    NODE webPushQueue.ts [src=server/services/webPushQueue.ts loc=L1 community=52]
    NODE devDependencies [src=package.json loc=L75 community=41]
    NODE card.tsx [src=src/app/components/ui/card.tsx loc=L1 community=43]
    NODE AuthContext.tsx [src=src/app/context/AuthContext.tsx loc=L1 community=11]
    NODE .__getNativeTag() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L333 community=28]
    NODE analytics.ts [src=server/routes/analytics.ts loc=L1 community=55]
    NODE dialog.tsx [src=src/app/components/ui/dialog.tsx loc=L1 community=17]
    NODE locationTracking.ts [src=server/locationTracking.ts loc=L1 community=40]
    NODE badge.tsx [src=src/app/components/ui/badge.tsx loc=L1 community=17]
    NODE Login.tsx [src=src/app/pages/Login.tsx loc=L1 community=43]
    NODE MapPicker.tsx [src=src/app/components/MapPicker.tsx loc=L1 community=34]
    NODE Badge() [src=src/app/components/ui/badge.tsx loc=L28 community=17]
    NODE shiftSchedule.ts [src=server/services/shiftSchedule.ts loc=L1 community=20]
    NODE deliveryNotifications.ts [src=mobile-app/services/deliveryNotifications.ts loc=L1 community=151]
    NODE auth.ts [src=server/middleware/auth.ts loc=L1 community=69]
    NODE dropdown-menu.tsx [src=src/app/components/ui/dropdown-menu.tsx loc=L1 community=17]
    NODE use-push-notifications.ts [src=mobile-app/hooks/use-push-notifications.ts loc=L1 community=221]
    NODE use-push-notifications.test.tsx [src=mobile-app/hooks/__tests__/use-push-notifications.test.tsx loc=L1 community=71]
    NODE PasswordResetOverlay.tsx [src=src/app/components/PasswordResetOverlay.tsx loc=L1 community=43]
    NODE Card() [src=src/app/components/ui/card.tsx loc=L5 community=43]
    NODE overdue.ts [src=server/utils/overdue.ts loc=L1 community=61]
    NODE sheet.tsx [src=src/app/components/ui/sheet.tsx loc=L1 community=17]
    NODE User [src=src/app/types/index.ts loc=L5 community=123]
    NODE .body() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L988 community=180]
    NODE DialogContent [src=src/app/components/ui/dialog.tsx loc=L33 community=17]
    NODE .__startAnimationIfNative() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L336 community=65]
    NODE LiveTrackingMap() [src=src/app/components/LiveTrackingMap.tsx loc=L364 community=82]
    NODE DialogTitle [src=src/app/components/ui/dialog.tsx loc=L85 community=17]
    NODE useRealTime() [src=src/app/context/RealTimeContext.tsx loc=L128 community=11]
    NODE proactiveOverdue.ts [src=server/services/proactiveOverdue.ts loc=L1 community=61]
    ... (truncated — 395 more nodes cut by ~2000-token budget. Narrow with context_filter=['call'] or use get_node for a specific symbol)
    mobile-app\app\__tests__\today-start-shift.test.tsx:11:  tasks: [], loading: true, refreshing: false, onRefresh: jest.fn(), notifications: [], unreadCount: 0,
    mobile-app\google-services.json:5:    "storage_bucket": "cfa-rss.firebasestorage.app"
    mobile-app\app\__tests__\overdue-shift-visibility.test.tsx:7:  tasks: [], loading: false, refreshing: false, onRefresh: jest.fn(), notifications: [], unreadCount: 0,
    mobile-app\index.js:5:  const messagingApi = require('@react-native-firebase/messaging');
    mobile-app\index.js:6:  const { createFirebaseMessagingClient } = require('./services/firebaseMessagingClient');
    mobile-app\plugins\withFcmNotificationColorManifest.js:3:const FCM_NOTIFICATION_COLOR = 'com.google.firebase.messaging.default_notification_color';
    mobile-app\plugins\withFcmNotificationColorManifest.js:9:  const metadata = app?.['meta-data']?.find((entry) => entry.$?.['android:name'] === FCM_NOTIFICATION_COLOR);
    mobile-app\app\__tests__\firebase-notification-config.test.ts:17:    expect(plugins).toContain('@react-native-firebase/app');
    mobile-app\app\__tests__\firebase-notification-config.test.ts:18:    expect(plugins).toContain('@react-native-firebase/messaging');
    mobile-app\app\__tests__\firebase-notification-config.test.ts:21:      .toBeLessThan(plugins.indexOf('expo-notifications'));
    mobile-app\app\__tests__\firebase-notification-config.test.ts:24:  it('marks Expo notification color as the authoritative FCM manifest resource', () => {
    mobile-app\app\__tests__\firebase-notification-config.test.ts:30:            'android:name': 'com.google.firebase.messaging.default_notification_color',
    mobile-app\app\__tests__\firebase-notification-config.test.ts:31:            'android:resource': '@color/notification_icon_color',
    mobile-app\package.json:23:    "@react-native-firebase/app": "^26.4.0",
    mobile-app\package.json:24:    "@react-native-firebase/messaging": "^26.4.0",
    mobile-app\package.json:45:    "expo-notifications": "~57.0.22",
    mobile-app\app\_layout.tsx:25:import { usePushNotifications } from '@/hooks/use-push-notifications';
    mobile-app\app\_layout.tsx:52:    void syncActiveDeliveryNotifications(tasks).catch((error) => console.warn('Unable to sync active delivery notification:', error));
    mobile-app\package-lock.json:17:        "@react-native-firebase/app": "^26.4.0",
    mobile-app\package-lock.json:18:        "@react-native-firebase/messaging": "^26.4.0",
    mobile-app\package-lock.json:39:        "expo-notifications": "~57.0.22",
    mobile-app\package-lock.json:2714:    "node_modules/@firebase/ai": {
    mobile-app\package-lock.json:2716:      "resolved": "https://registry.npmjs.org/@firebase/ai/-/ai-2.14.0.tgz",
    mobile-app\package-lock.json:2720:        "@firebase/app-check-interop-types": "0.3.4",
    mobile-app\package-lock.json:2721:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2722:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2723:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2730:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2731:        "@firebase/app-types": "0.x"
    mobile-app\package-lock.json:2734:    "node_modules/@firebase/analytics": {
    mobile-app\package-lock.json:2736:      "resolved": "https://registry.npmjs.org/@firebase/analytics/-/analytics-0.10.23.tgz",
    mobile-app\package-lock.json:2740:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2741:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:2742:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2743:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2747:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:2750:    "node_modules/@firebase/analytics-compat": {
    mobile-app\package-lock.json:2752:      "resolved": "https://registry.npmjs.org/@firebase/analytics-compat/-/analytics-compat-0.2.29.tgz",
    mobile-app\package-lock.json:2756:        "@firebase/analytics": "0.10.23",
    mobile-app\package-lock.json:2757:        "@firebase/analytics-types": "0.8.4",
    mobile-app\package-lock.json:2758:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2759:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2763:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2764:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:2767:    "node_modules/@firebase/analytics-types": {
    mobile-app\package-lock.json:2769:      "resolved": "https://registry.npmjs.org/@firebase/analytics-types/-/analytics-types-0.8.4.tgz",
    mobile-app\package-lock.json:2773:    "node_modules/@firebase/app": {
    mobile-app\package-lock.json:2775:      "resolved": "https://registry.npmjs.org/@firebase/app/-/app-0.16.0.tgz",
    mobile-app\package-lock.json:2779:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2780:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2781:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2789:    "node_modules/@firebase/app-check": {
    mobile-app\package-lock.json:2791:      "resolved": "https://registry.npmjs.org/@firebase/app-check/-/app-check-0.13.0.tgz",
    mobile-app\package-lock.json:2795:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2796:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2797:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2804:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:2807:    "node_modules/@firebase/app-check-compat": {
    mobile-app\package-lock.json:2809:      "resolved": "https://registry.npmjs.org/@firebase/app-check-compat/-/app-check-compat-0.4.6.tgz",
    mobile-app\package-lock.json:2813:        "@firebase/app-check": "0.13.0",
    mobile-app\package-lock.json:2814:        "@firebase/app-check-types": "0.5.4",
    mobile-app\package-lock.json:2815:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2816:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2817:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2824:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2825:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:2828:    "node_modules/@firebase/app-check-interop-types": {
    mobile-app\package-lock.json:2830:      "resolved": "https://registry.npmjs.org/@firebase/app-check-interop-types/-/app-check-interop-types-0.3.4.tgz",
    mobile-app\package-lock.json:2834:    "node_modules/@firebase/app-check-types": {
    mobile-app\package-lock.json:2836:      "resolved": "https://registry.npmjs.org/@firebase/app-check-types/-/app-check-types-0.5.4.tgz",
    mobile-app\package-lock.json:2840:    "node_modules/@firebase/app-compat": {
    mobile-app\package-lock.json:2842:      "resolved": "https://registry.npmjs.org/@firebase/app-compat/-/app-compat-0.5.16.tgz",
    mobile-app\package-lock.json:2846:        "@firebase/app": "0.16.0",
    mobile-app\package-lock.json:2847:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2848:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2849:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2856:    "node_modules/@firebase/app-types": {
    mobile-app\package-lock.json:2858:      "resolved": "https://registry.npmjs.org/@firebase/app-types/-/app-types-0.9.5.tgz",
    mobile-app\package-lock.json:2862:        "@firebase/logger": "0.5.1"
    mobile-app\package-lock.json:2865:    "node_modules/@firebase/auth": {
    mobile-app\package-lock.json:2867:      "resolved": "https://registry.npmjs.org/@firebase/auth/-/auth-1.13.4.tgz",
    mobile-app\package-lock.json:2871:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2872:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2873:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2880:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2889:    "node_modules/@firebase/auth-compat": {
    mobile-app\package-lock.json:2891:      "resolved": "https://registry.npmjs.org/@firebase/auth-compat/-/auth-compat-0.6.9.tgz",
    mobile-app\package-lock.json:2895:        "@firebase/auth": "1.13.4",
    mobile-app\package-lock.json:2896:        "@firebase/auth-types": "0.13.1",
    mobile-app\package-lock.json:2897:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2898:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2905:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2906:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:2909:    "node_modules/@firebase/auth-interop-types": {
    mobile-app\package-lock.json:2911:      "resolved": "https://registry.npmjs.org/@firebase/auth-interop-types/-/auth-interop-types-0.2.5.tgz",
    mobile-app\package-lock.json:2915:    "node_modules/@firebase/auth-types": {
    mobile-app\package-lock.json:2917:      "resolved": "https://registry.npmjs.org/@firebase/auth-types/-/auth-types-0.13.1.tgz",
    mobile-app\package-lock.json:2921:        "@firebase/app-types": "0.x",
    mobile-app\package-lock.json:2922:        "@firebase/util": "1.x"
    mobile-app\package-lock.json:2925:    "node_modules/@firebase/component": {
    mobile-app\package-lock.json:2927:      "resolved": "https://registry.npmjs.org/@firebase/component/-/component-0.7.4.tgz",
    mobile-app\package-lock.json:2931:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2938:    "node_modules/@firebase/data-connect": {
    mobile-app\package-lock.json:2940:      "resolved": "https://registry.npmjs.org/@firebase/data-connect/-/data-connect-0.7.3.tgz",
    mobile-app\package-lock.json:2944:        "@firebase/auth-interop-types": "0.2.5",
    mobile-app\package-lock.json:2945:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2946:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2947:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2951:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:2954:    "node_modules/@firebase/database": {
    mobile-app\package-lock.json:2956:      "resolved": "https://registry.npmjs.org/@firebase/database/-/database-1.1.4.tgz",
    mobile-app\package-lock.json:2960:        "@firebase/app-check-interop-types": "0.3.4",
    mobile-app\package-lock.json:2961:        "@firebase/auth-interop-types": "0.2.5",
    mobile-app\package-lock.json:2962:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2963:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2964:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2972:    "node_modules/@firebase/database-compat": {
    mobile-app\package-lock.json:2974:      "resolved": "https://registry.npmjs.org/@firebase/database-compat/-/database-compat-2.1.6.tgz",
    mobile-app\package-lock.json:2978:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:2979:        "@firebase/database": "1.1.4",
    mobile-app\package-lock.json:2980:        "@firebase/database-types": "1.0.21",
    mobile-app\package-lock.json:2981:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:2982:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:2989:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:2990:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:2993:        "@firebase/app": {
    mobile-app\package-lock.json:2996:        "@firebase/app-compat": {
    mobile-app\package-lock.json:3001:    "node_modules/@firebase/database-types": {
    mobile-app\package-lock.json:3003:      "resolved": "https://registry.npmjs.org/@firebase/database-types/-/database-types-1.0.21.tgz",
    mobile-app\package-lock.json:3007:        "@firebase/app-types": "0.9.5",
    mobile-app\package-lock.json:3008:        "@firebase/util": "1.15.2"
    mobile-app\package-lock.json:3011:    "node_modules/@firebase/firestore": {
    mobile-app\package-lock.json:3013:      "resolved": "https://registry.npmjs.org/@firebase/firestore/-/firestore-4.17.0.tgz",
    mobile-app\package-lock.json:3017:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3018:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:3019:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3020:        "@firebase/webchannel-wrapper": "1.0.6",
    mobile-app\package-lock.json:3030:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3033:    "node_modules/@firebase/firestore-compat": {
    mobile-app\package-lock.json:3035:      "resolved": "https://registry.npmjs.org/@firebase/firestore-compat/-/firestore-compat-0.4.12.tgz",
    mobile-app\package-lock.json:3039:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3040:        "@firebase/firestore": "4.17.0",
    mobile-app\package-lock.json:3041:        "@firebase/firestore-types": "3.0.4",
    mobile-app\package-lock.json:3042:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3049:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3050:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3053:    "node_modules/@firebase/firestore-types": {
    mobile-app\package-lock.json:3055:      "resolved": "https://registry.npmjs.org/@firebase/firestore-types/-/firestore-types-3.0.4.tgz",
    mobile-app\package-lock.json:3059:        "@firebase/app-types": "0.x",
    mobile-app\package-lock.json:3060:        "@firebase/util": "1.x"
    mobile-app\package-lock.json:3063:    "node_modules/@firebase/functions": {
    mobile-app\package-lock.json:3065:      "resolved": "https://registry.npmjs.org/@firebase/functions/-/functions-0.13.6.tgz",
    mobile-app\package-lock.json:3069:        "@firebase/app-check-interop-types": "0.3.4",
    mobile-app\package-lock.json:3070:        "@firebase/auth-interop-types": "0.2.5",
    mobile-app\package-lock.json:3071:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3072:        "@firebase/messaging-interop-types": "0.2.5",
    mobile-app\package-lock.json:3073:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3080:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3083:    "node_modules/@firebase/functions-compat": {
    mobile-app\package-lock.json:3085:      "resolved": "https://registry.npmjs.org/@firebase/functions-compat/-/functions-compat-0.4.6.tgz",
    mobile-app\package-lock.json:3089:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3090:        "@firebase/functions": "0.13.6",
    mobile-app\package-lock.json:3091:        "@firebase/functions-types": "0.6.4",
    mobile-app\package-lock.json:3092:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3099:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3100:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3103:    "node_modules/@firebase/functions-types": {
    mobile-app\package-lock.json:3105:      "resolved": "https://registry.npmjs.org/@firebase/functions-types/-/functions-types-0.6.4.tgz",
    mobile-app\package-lock.json:3109:    "node_modules/@firebase/installations": {
    mobile-app\package-lock.json:3111:      "resolved": "https://registry.npmjs.org/@firebase/installations/-/installations-0.6.23.tgz",
    mobile-app\package-lock.json:3115:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3116:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3121:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3124:    "node_modules/@firebase/installations-compat": {
    mobile-app\package-lock.json:3126:      "resolved": "https://registry.npmjs.org/@firebase/installations-compat/-/installations-compat-0.2.23.tgz",
    mobile-app\package-lock.json:3130:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3131:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:3132:        "@firebase/installations-types": "0.5.4",
    mobile-app\package-lock.json:3133:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3137:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3138:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3141:    "node_modules/@firebase/installations-types": {
    mobile-app\package-lock.json:3143:      "resolved": "https://registry.npmjs.org/@firebase/installations-types/-/installations-types-0.5.4.tgz",
    mobile-app\package-lock.json:3147:        "@firebase/app-types": "0.x"
    mobile-app\package-lock.json:3150:    "node_modules/@firebase/logger": {
    mobile-app\package-lock.json:3152:      "resolved": "https://registry.npmjs.org/@firebase/logger/-/logger-0.5.1.tgz",
    mobile-app\package-lock.json:3162:    "node_modules/@firebase/messaging": {
    mobile-app\package-lock.json:3164:      "resolved": "https://registry.npmjs.org/@firebase/messaging/-/messaging-0.13.1.tgz",
    mobile-app\package-lock.json:3168:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3169:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:3170:        "@firebase/messaging-interop-types": "0.2.5",
    mobile-app\package-lock.json:3171:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3176:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3179:    "node_modules/@firebase/messaging-compat": {
    mobile-app\package-lock.json:3181:      "resolved": "https://registry.npmjs.org/@firebase/messaging-compat/-/messaging-compat-0.2.28.tgz",
    mobile-app\package-lock.json:3185:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3186:        "@firebase/messaging": "0.13.1",
    mobile-app\package-lock.json:3187:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3191:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3192:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3195:    "node_modules/@firebase/messaging-interop-types": {
    mobile-app\package-lock.json:3197:      "resolved": "https://registry.npmjs.org/@firebase/messaging-interop-types/-/messaging-interop-types-0.2.5.tgz",
    mobile-app\package-lock.json:3201:    "node_modules/@firebase/performance": {
    mobile-app\package-lock.json:3203:      "resolved": "https://registry.npmjs.org/@firebase/performance/-/performance-0.7.13.tgz",
    mobile-app\package-lock.json:3207:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3208:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:3209:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:3210:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3215:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3218:    "node_modules/@firebase/performance-compat": {
    mobile-app\package-lock.json:3220:      "resolved": "https://registry.npmjs.org/@firebase/performance-compat/-/performance-compat-0.2.26.tgz",
    mobile-app\package-lock.json:3224:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3225:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:3226:        "@firebase/performance": "0.7.13",
    mobile-app\package-lock.json:3227:        "@firebase/performance-types": "0.2.4",
    mobile-app\package-lock.json:3228:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3232:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3233:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3236:    "node_modules/@firebase/performance-types": {
    mobile-app\package-lock.json:3238:      "resolved": "https://registry.npmjs.org/@firebase/performance-types/-/performance-types-0.2.4.tgz",
    mobile-app\package-lock.json:3242:    "node_modules/@firebase/remote-config": {
    mobile-app\package-lock.json:3244:      "resolved": "https://registry.npmjs.org/@firebase/remote-config/-/remote-config-0.9.1.tgz",
    mobile-app\package-lock.json:3248:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3249:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:3250:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:3251:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3255:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3258:    "node_modules/@firebase/remote-config-compat": {
    mobile-app\package-lock.json:3260:      "resolved": "https://registry.npmjs.org/@firebase/remote-config-compat/-/remote-config-compat-0.2.28.tgz",
    mobile-app\package-lock.json:3264:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3265:        "@firebase/logger": "0.5.1",
    mobile-app\package-lock.json:3266:        "@firebase/remote-config": "0.9.1",
    mobile-app\package-lock.json:3267:        "@firebase/remote-config-types": "0.5.1",
    mobile-app\package-lock.json:3268:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3272:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3273:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3276:    "node_modules/@firebase/remote-config-types": {
    mobile-app\package-lock.json:3278:      "resolved": "https://registry.npmjs.org/@firebase/remote-config-types/-/remote-config-types-0.5.1.tgz",
    mobile-app\package-lock.json:3282:    "node_modules/@firebase/storage": {
    mobile-app\package-lock.json:3284:      "resolved": "https://registry.npmjs.org/@firebase/storage/-/storage-0.14.4.tgz",
    mobile-app\package-lock.json:3288:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3289:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3296:        "@firebase/app": "0.x"
    mobile-app\package-lock.json:3299:    "node_modules/@firebase/storage-compat": {
    mobile-app\package-lock.json:3301:      "resolved": "https://registry.npmjs.org/@firebase/storage-compat/-/storage-compat-0.4.4.tgz",
    mobile-app\package-lock.json:3305:        "@firebase/component": "0.7.4",
    mobile-app\package-lock.json:3306:        "@firebase/storage": "0.14.4",
    mobile-app\package-lock.json:3307:        "@firebase/storage-types": "0.8.4",
    mobile-app\package-lock.json:3308:        "@firebase/util": "1.15.2",
    mobile-app\package-lock.json:3315:        "@firebase/app": "0.x",
    mobile-app\package-lock.json:3316:        "@firebase/app-compat": "0.x"
    mobile-app\package-lock.json:3319:    "node_modules/@firebase/storage-types": {
    mobile-app\package-lock.json:3321:      "resolved": "https://registry.npmjs.org/@firebase/storage-types/-/storage-types-0.8.4.tgz",
    mobile-app\package-lock.json:3325:        "@firebase/app-types": "0.x",
    mobile-app\package-lock.json:3326:        "@firebase/util": "1.x"
    mobile-app\package-lock.json:3329:    "node_modules/@firebase/util": {
    mobile-app\package-lock.json:3331:      "resolved": "https://registry.npmjs.org/@firebase/util/-/util-1.15.2.tgz",
    mobile-app\package-lock.json:3342:    "node_modules/@firebase/webchannel-wrapper": {
    mobile-app\package-lock.json:3344:      "resolved": "https://registry.npmjs.org/@firebase/webchannel-wrapper/-/webchannel-wrapper-1.0.6.tgz",
    mobile-app\package-lock.json:4344:    "node_modules/@react-native-firebase/app": {
    mobile-app\package-lock.json:4346:      "resolved": "https://registry.npmjs.org/@react-native-firebase/app/-/app-26.4.0.tgz",
    mobile-app\package-lock.json:4350:        "firebase": "12.17.1"
    mobile-app\package-lock.json:4363:    "node_modules/@react-native-firebase/messaging": {
    mobile-app\package-lock.json:4365:      "resolved": "https://registry.npmjs.org/@react-native-firebase/messaging/-/messaging-26.4.0.tgz",
    mobile-app\package-lock.json:4369:        "@react-native-firebase/app": "26.4.0",
    mobile-app\package-lock.json:9057:    "node_modules/expo-notifications": {
    mobile-app\package-lock.json:9059:      "resolved": "https://registry.npmjs.org/expo-notifications/-/expo-notifications-57.0.22.tgz",
    mobile-app\package-lock.json:9853:    "node_modules/firebase": {
    mobile-app\package-lock.json:9855:      "resolved": "https://registry.npmjs.org/firebase/-/firebase-12.17.1.tgz",
    mobile-app\package-lock.json:9859:        "@firebase/ai": "2.14.0",
    mobile-app\package-lock.json:9860:        "@firebase/analytics": "0.10.23",
    mobile-app\package-lock.json:9861:        "@firebase/analytics-compat": "0.2.29",
    mobile-app\package-lock.json:9862:        "@firebase/app": "0.16.0",
    mobile-app\package-lock.json:9863:        "@firebase/app-check": "0.13.0",
    mobile-app\package-lock.json:9864:        "@firebase/app-check-compat": "0.4.6",
    mobile-app\package-lock.json:9865:        "@firebase/app-compat": "0.5.16",
    mobile-app\package-lock.json:9866:        "@firebase/app-types": "0.9.5",
    mobile-app\package-lock.json:9867:        "@firebase/auth": "1.13.4",
    mobile-app\package-lock.json:9868:        "@firebase/auth-compat": "0.6.9",
    mobile-app\package-lock.json:9869:        "@firebase/data-connect": "0.7.3",
    mobile-app\package-lock.json:9870:        "@firebase/database": "1.1.4",
    mobile-app\package-lock.json:9871:        "@firebase/database-compat": "2.1.6",
    mobile-app\package-lock.json:9872:        "@firebase/firestore": "4.17.0",
    mobile-app\package-lock.json:9873:        "@firebase/firestore-compat": "0.4.12",
    mobile-app\package-lock.json:9874:        "@firebase/functions": "0.13.6",
    mobile-app\package-lock.json:9875:        "@firebase/functions-compat": "0.4.6",
    mobile-app\package-lock.json:9876:        "@firebase/installations": "0.6.23",
    mobile-app\package-lock.json:9877:        "@firebase/installations-compat": "0.2.23",
    mobile-app\package-lock.json:9878:        "@firebase/messaging": "0.13.1",
    mobile-app\package-lock.json:9879:        "@firebase/messaging-compat": "0.2.28",
    mobile-app\package-lock.json:9880:        "@firebase/performance": "0.7.13",
    mobile-app\package-lock.json:9881:        "@firebase/performance-compat": "0.2.26",
    mobile-app\package-lock.json:9882:        "@firebase/remote-config": "0.9.1",
    mobile-app\package-lock.json:9883:        "@firebase/remote-config-compat": "0.2.28",
    mobile-app\package-lock.json:9884:        "@firebase/storage": "0.14.4",
    mobile-app\package-lock.json:9885:        "@firebase/storage-compat": "0.4.4",
    mobile-app\package-lock.json:9886:        "@firebase/util": "1.15.2"
    mobile-app\app\(tabs)\tomorrow.tsx:29:    notifications,
    mobile-app\app\(tabs)\tomorrow.tsx:143:        notifications={notifications}
    mobile-app\coverage\lcov-report\services\apiService.ts.html:176:  const response = <span class="cstat-no" title="statement not covered" >await api.get('/api/notifications', {</span>
    mobile-app\coverage\lcov-report\services\apiService.ts.html:182:export const markNotificationAsRead = <span class="fstat-no" title="function not covered" >as</span>ync (notificationId: string) =&gt; {
    mobile-app\coverage\lcov-report\services\apiService.ts.html:183:<span class="cstat-no" title="statement not covered" >  return api.put(`/api/notifications/${notificationId}/read`);</span>
    mobile-app\coverage\lcov-report\services\apiService.ts.html:187:<span class="cstat-no" title="statement not covered" >  return api.put(`/api/notifications/read-all/${userId}`);</span>
    src\app\personnel-v2\PersonnelV2Page.tsx:271:  const [notificationRequestId, setNotificationRequestId] = useState<string | null>(null);
    src\app\personnel-v2\PersonnelV2Page.tsx:551:            {activeView === "help" ? <HelpPanel /> : activeView === "requests" ? <RequestsPanel requests={myRequests} openRequestId={notificationRequestId} onOpenedRequest={() => setNotificationRequestId(null)} onCancel={(requestId) => cancelRequest(requestId)} onRebook={handleRebookRequest} onRevise={startRevision} /> : activeView === "preferences" ? <PreferencesPanel onInstall={install} canInstall={Boolean(installPrompt)} onLogout={logout} fetchWithAuth={fetchWithAuth} /> : <>
    src\app\personnel-v2\PersonnelV2Page.tsx:625:  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
    src\app\personnel-v2\PersonnelV2Page.tsx:627:  const myNotifications = (Array.isArray(notifications) ? notifications : [])
    src\app\personnel-v2\PersonnelV2Page.tsx:628:    .filter((notification) => notification.user_id === user?.id)
    src\app\personnel-v2\PersonnelV2Page.tsx:630:  const unreadCount = myNotifications.filter((notification) => !notification.read).length;
    src\app\personnel-v2\PersonnelV2Page.tsx:646:          {myNotifications.length === 0 ? <div className="py-12 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-slate-200" /><p className="text-xs font-bold uppercase tracking-widest text-slate-400">All caught up</p></div> : myNotifications.map((notification) => <button type="button" key={notification.id} className={`w-full rounded-xl border p-3 text-left ${notification.read ? "border-slate-100 bg-slate-50/60" : "border-emerald-100 bg-emerald-50"}`} onClick={() => { void markNotificationRead(notification.id); setOpen(false); if (notification.request_id) window.dispatchEvent(new CustomEvent("personnel:open-request", { detail: { requestId: notification.request_id } })); }}><div className="flex items-start gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{notification.message}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{new Date(notification.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></div></button>)}
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:3:import { usePushNotifications } from '../use-push-notifications';
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:39:jest.mock('expo-notifications', () => ({
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:50:jest.mock('@react-native-firebase/messaging', () => ({
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:82:it('registers a native FCM token for the signed-in rider', async () => {
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:92:it('refreshes rider queries and captures the alert when an FCM message arrives in foreground', async () => {
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:99:    notification: { title: 'New delivery', body: 'A task was assigned.' },
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:104:    ['notifications', 'rider-1'], ['tasks', 'rider-1'], ['historyTasks', 'rider-1'], ['job', 'rider-1', 'job-1'],
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:106:  expect(result.current.notification).toMatchObject({ messageId: 'event-1' });
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:108:    notification: expect.objectContaining({ title: 'New delivery', body: 'A task was assigned.' }),
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:112:it('routes an FCM notification tap and ignores a duplicate callback', async () => {
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:127:it('routes an app cold-started from an FCM notification', async () => {
    src\app\utils\__tests__\webPush.test.ts:63:    expect(authenticatedFetch).toHaveBeenCalledWith('/api/notifications/web-push/status', {
    src\app\utils\__tests__\webPush.test.ts:77:    expect(authenticatedFetch).toHaveBeenLastCalledWith('/api/notifications/web-push/subscribe', {
    server\services\__tests__\webPushQueue.test.ts:37:  it('queues only an eligible saved notification and deduplicates by notification id', async () => {
    server\services\__tests__\webPushQueue.test.ts:38:    query.mockImplementation(async (sql: string) => String(sql || '').includes('FROM notifications n')
    server\services\__tests__\webPushQueue.test.ts:44:    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM notifications n'), ['notif-1']);
    server\services\__tests__\webPushQueue.test.ts:45:    const notificationLookup = query.mock.calls.find(([sql]) => String(sql).includes('FROM notifications n'))?.[0];
    server\services\__tests__\webPushQueue.test.ts:46:    expect(String(notificationLookup)).toContain('n.user_id COLLATE utf8mb4_unicode_ci = u.id');
    server\services\__tests__\webPushQueue.test.ts:52:  it('does not create work for an ineligible notification', async () => {
    server\services\__tests__\webPushQueue.test.ts:53:    query.mockImplementation(async (sql: string) => String(sql || '').includes('FROM notifications n')
    server\services\__tests__\webPushQueue.test.ts:62:  it('reconciles eligible saved notifications that failed their first enqueue attempt', async () => {
    server\services\__tests__\webPushQueue.test.ts:68:      if (String(sql).includes('FROM notifications n')) return [[{
    server\services\__tests__\webPushQueue.test.ts:80:  it('uses an explicit collation when matching notification IDs to queue IDs', async () => {
    server\services\__tests__\webPushQueue.test.ts:85:    expect(String(reconcileQuery)).toContain('q.notification_id = n.id COLLATE utf8mb4_unicode_ci');
    mobile-app\utils\__tests__\pushNotificationEvents.test.ts:6:    expect(getPushEventKey({ notificationId: 'notif-1' })).toBe('notif-1');
    mobile-app\utils\__tests__\pushNotificationEvents.test.ts:16:      ['notifications', 'rider-1'],
    mobile-app\app\(tabs)\overdue.tsx:27:    notifications,
    mobile-app\app\(tabs)\overdue.tsx:109:        notifications={notifications}
    mobile-app\utils\pushNotificationEvents.ts:6:  const key = data.eventId || data.notificationId || data.messageId || data.message_id || fallback;
    mobile-app\utils\pushNotificationEvents.ts:16:  queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    src\app\utils\__tests__\notificationMessages.test.ts:2:import { getRequestUpdateToast } from '../notificationMessages';
    src\app\utils\__tests__\notificationMessages.test.ts:4:describe('request update notifications', () => {
    mobile-app\hooks\use-push-notifications.ts:5:import type { Notification } from 'expo-notifications';
    mobile-app\hooks\use-push-notifications.ts:11:import { createFirebaseMessagingClient, type FirebaseMessagingApi } from '@/services/firebaseMessagingClient';
    mobile-app\hooks\use-push-notifications.ts:18:  : (require('expo-notifications') as typeof import('expo-notifications'));
    mobile-app\hooks\use-push-notifications.ts:23:    const messagingModule = require('@react-native-firebase/messaging') as FirebaseMessagingApi;
    mobile-app\hooks\use-push-notifications.ts:46:  const [notification, setNotification] = useState<Notification | false>(false);
    mobile-app\hooks\use-push-notifications.ts:76:    const handleNotificationResponse = (response: import('expo-notifications').NotificationResponse) => {
    mobile-app\hooks\use-push-notifications.ts:77:      const data = response.notification.request.content.data as Record<string, unknown>;
    mobile-app\hooks\use-push-notifications.ts:78:      const fallback = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
    mobile-app\hooks\use-push-notifications.ts:90:          console.warn('[PUSH] Unable to register a refreshed FCM token.');
    mobile-app\hooks\use-push-notifications.ts:93:      .catch(() => console.warn('[PUSH] FCM registration failed.'));
    mobile-app\hooks\use-push-notifications.ts:100:        console.warn('[PUSH] Unable to show foreground notification.');
    mobile-app\hooks\use-push-notifications.ts:104:    const notificationListener = Notifications.addNotificationReceivedListener((received) => {
    mobile-app\hooks\use-push-notifications.ts:123:      notificationListener.remove();
    mobile-app\hooks\use-push-notifications.ts:128:  return { fcmToken, notification };
    src\app\pages\__tests__\notification-filtering.test.ts:4:const filterNotifications = (notifications: any[], user: any, requests: any[]) => {
    src\app\pages\__tests__\notification-filtering.test.ts:5:  return notifications.filter(n => {
    src\app\pages\__tests__\notification-filtering.test.ts:21:  it('✅ Logic: Should show active request notifications', () => {
    src\app\pages\__tests__\notification-filtering.test.ts:22:    const notifications = [
    src\app\pages\__tests__\notification-filtering.test.ts:29:    const result = filterNotifications(notifications, mockUser, requests);
    src\app\pages\__tests__\notification-filtering.test.ts:34:  it('keeps completed delivery notifications as readable history', () => {
    src\app\pages\__tests__\notification-filtering.test.ts:35:    const notifications = [
    src\app\pages\__tests__\notification-filtering.test.ts:42:    const result = filterNotifications(notifications, mockUser, requests);
    src\app\pages\__tests__\notification-filtering.test.ts:46:  it('keeps failed delivery notifications as readable history', () => {
    src\app\pages\__tests__\notification-filtering.test.ts:47:    const notifications = [
    src\app\pages\__tests__\notification-filtering.test.ts:54:    const result = filterNotifications(notifications, mockUser, requests);
    src\app\pages\__tests__\notification-filtering.test.ts:58:  it('🛑 Hardening: Should hide notifications for SUBMITTED_WAITING (Internal)', () => {
    src\app\pages\__tests__\notification-filtering.test.ts:59:    const notifications = [
    src\app\pages\__tests__\notification-filtering.test.ts:66:    const result = filterNotifications(notifications, mockUser, requests);
    src\app\pages\__tests__\notification-filtering.test.ts:70:  it('🛑 Integrity: Should exclude notifications for other users', () => {
    src\app\pages\__tests__\notification-filtering.test.ts:71:    const notifications = [
    src\app\pages\__tests__\notification-filtering.test.ts:78:    const result = filterNotifications(notifications, mockUser, requests);
    src\app\pages\__tests__\notification-filtering.test.ts:82:  it('⚡ Performance: Should limit to 50 notifications', () => {
    mobile-app\coverage\lcov-report\mobile-app\services\apiService.ts.html:176:  const response = <span class="cstat-no" title="statement not covered" >await api.get('/api/notifications', {</span>
    mobile-app\coverage\lcov-report\mobile-app\services\apiService.ts.html:182:export const markNotificationAsRead = <span class="cstat-no" title="statement not covered" ><span class="fstat-no" title="function not covered" >as</span>ync (notificationId: string) =&gt; {</span>
    mobile-app\coverage\lcov-report\mobile-app\services\apiService.ts.html:183:<span class="cstat-no" title="statement not covered" >  return api.put(`/api/notifications/${notificationId}/read`);</span>
    mobile-app\coverage\lcov-report\mobile-app\services\apiService.ts.html:187:<span class="cstat-no" title="statement not covered" >  return api.put(`/api/notifications/read-all/${userId}`);</span>
    mobile-app\app\(tabs)\index.tsx:48:    notifications,
    mobile-app\app\(tabs)\index.tsx:271:        notifications={notifications}
    server\services\__tests__\webPushDispatcher.test.ts:25:  notification_id: 'notif-1', user_id: 'admin-1', recipient_role: 'admin',
    server\services\__tests__\webPushDispatcher.test.ts:26:  notification_type: 'request_submitted', request_id: 'req-1',
    server\services\__tests__\webPushDispatcher.test.ts:36:    if (sql.includes('SELECT notification_id, user_id, recipient_role')) {
    server\services\__tests__\webPushDispatcher.test.ts:80:      tag: 'notif-1', data: { notificationId: 'notif-1', requestId: 'req 123', url: '/admin/dashboard?request=req%20123' },
    src\app\utils\webPush.ts:59:  const response = await fetchWithAuth('/api/notifications/web-push/status', {
    src\app\utils\webPush.ts:63:  if (!response?.ok) throw new Error('Unable to read browser notification settings.');
    src\app\utils\webPush.ts:74:  if (!supportsWebPush()) throw new Error('This browser does not support push notifications.');
    src\app\utils\webPush.ts:76:  const configResponse = await fetchWithAuth('/api/notifications/web-push/config');
    src\app\utils\webPush.ts:77:  if (!configResponse?.ok) throw new Error('Unable to load notification settings.');
    src\app\utils\webPush.ts:79:  if (!config.enabled || !config.publicKey) throw new Error('Browser notifications are not configured yet.');
    src\app\utils\webPush.ts:98:  const response = await fetchWithAuth('/api/notifications/web-push/subscribe', {
    src\app\utils\webPush.ts:102:  if (!response?.ok) throw new Error('Unable to save this device for notifications.');
    src\app\utils\webPush.ts:111:  const response = await fetchWithAuth('/api/notifications/web-push/subscribe', {
    src\app\utils\webPush.ts:115:  if (!response?.ok) throw new Error('Unable to disable browser notifications.');
    mobile-app\app\(tabs)\inbox.tsx:20:    notifications,
    mobile-app\app\(tabs)\inbox.tsx:88:        notifications={notifications}
    mobile-app\hooks\data\useJobDetails.ts:351:    ).catch((error) => console.warn('Unable to update active delivery notification:', error));
    server\services\__tests__\shiftCutoff.test.ts:124:    expect(emit).toHaveBeenCalledWith('notification-added', expect.objectContaining({ type: 'warning' }));
    src\app\pages\Dashboard.tsx:20:  const { notifications, markNotificationRead, markAllNotificationsRead, requests } = useData();
    src\app\pages\Dashboard.tsx:38:  // Filter notifications for current user and exclude those linked to completed/failed transactions
    src\app\pages\Dashboard.tsx:40:  const myNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    src\app\pages\Dashboard.tsx:58:  const handleNotificationClick = (notificationId: string, requestId?: string) => {
    src\app\pages\Dashboard.tsx:59:    markNotificationRead(notificationId);
    src\app\pages\Dashboard.tsx:62:      setIsSheetOpen(false); // Close the notification sheet
    src\app\pages\Dashboard.tsx:93:    // Return different emojis based on notification type
    src\app\pages\Dashboard.tsx:155:                      <SheetDescription className="sr-only">Recent updates and notifications for your account.</SheetDescription>
    src\app\pages\Dashboard.tsx:170:                      <p className="text-muted-foreground text-center py-8">No notifications</p>
    src\app\pages\Dashboard.tsx:172:                      myNotifications.map(notification => (
    src\app\pages\Dashboard.tsx:174:                          key={notification.id}
    src\app\pages\Dashboard.tsx:176:                            notification.read ? 'bg-muted/50' : 'bg-blue-50 border-blue-200'
    src\app\pages\Dashboard.tsx:178:                          onClick={() => handleNotificationClick(notification.id, notification.request_id)}
    src\app\pages\Dashboard.tsx:181:                            <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
    src\app\pages\Dashboard.tsx:183:                              <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
    src\app\pages\Dashboard.tsx:184:                                {notification.message}
    src\app\pages\Dashboard.tsx:187:                                {format(parseISO(notification.created_at), 'PPp')}
    server\services\fcm.ts:1:import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
    server\services\fcm.ts:2:import { getMessaging, type Messaging } from 'firebase-admin/messaging';
    server\services\fcm.ts:36:  notification: FcmNotification,
    server\services\fcm.ts:39:  const priority = notification.priority || 'high';
    server\services\fcm.ts:42:    notification: { title: notification.title, body: notification.body },
    server\services\fcm.ts:43:    ...(notification.data ? { data: toFcmData(notification.data) } : {}),
    server\services\fcm.ts:46:      notification: {
    server\services\fcm.ts:47:        channelId: notification.channelId || 'default',
    server\services\fcm.ts:48:        ...(notification.tag ? { tag: notification.tag } : {}),
    server\services\fcm.ts:56:          ...(notification.categoryId ? { category: notification.categoryId } : {}),
    server\services\fcm.ts:57:          ...(notification.tag ? { threadId: notification.tag } : {}),
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:6:    <title>Code coverage report for mobile-app/hooks/use-push-notifications.ts</title>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:22:        <h1><a href="../../index.html">All files</a> / <a href="index.html">mobile-app/hooks</a> use-push-notifications.ts</h1>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:277:import * as Notifications from 'expo-notifications';
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:281:// Config: Allow push notifications
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:284:// Set how to handle notifications when app is in foreground
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:294: * Hook to manage push notifications.
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:298:  const [notification, setNotification] = <span class="cstat-no" title="statement not covered" >useState&lt;Notifications.Notification | false&gt;(false);</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:299:  const notificationListener = <span class="cstat-no" title="statement not covered" >useRef&lt;Notifications.Subscription | null&gt;(null);</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:304:<span class="cstat-no" title="statement not covered" >      console.log("Push notifications disabled for testing");</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:314:<span class="cstat-no" title="statement not covered" >        api.post('/api/notifications/register-token', { token })</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:319:<span class="cstat-no" title="statement not covered" >              console.error('Failed to register push token:', err);</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:325:<span class="cstat-no" title="statement not covered" >    notificationListener.current = Notifications.addNotificationReceivedListener(<span class="fstat-no" title="function not covered" >no</span>tification =&gt; {</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:326:<span class="cstat-no" title="statement not covered" >      setNotification(notification);</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:334:<span class="cstat-no" title="statement not covered" >      if (notificationListener.current) {</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:335:<span class="cstat-no" title="statement not covered" >        notificationListener.current.remove();</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:343:<span class="cstat-no" title="statement not covered" >  return { expoPushToken, notification };</span>
    mobile-app\coverage\lcov-report\mobile-app\hooks\use-push-notifications.ts.html:372:<span class="cstat-no" title="statement not covered" >      console.log('Could not get push token', e);</span>
    mobile-app\hooks\data\useDashboard.ts:45:    data: notifications = [],
    mobile-app\hooks\data\useDashboard.ts:49:    queryKey: ['notifications', user?.id],
    mobile-app\hooks\data\useDashboard.ts:55:  // load. History and notifications refresh independently and must not cause
    mobile-app\hooks\data\useDashboard.ts:136:    notifications,
    mobile-app\hooks\data\useDashboard.ts:137:    unreadCount: notifications.filter((n: any) => !n.is_read).length,
    mobile-app\app\(tabs)\history.tsx:25:    notifications,
    mobile-app\app\(tabs)\history.tsx:110:        notifications={notifications}
    server\services\__tests__\proactiveOverduePush.test.ts:16:vi.mock('../../routes/notifications', () => ({
    server\services\__tests__\proactiveOverduePush.test.ts:51:      if (sql.includes('SELECT id FROM notifications')) {
    server\services\__tests__\proactiveOverduePush.test.ts:54:      if (sql.includes('INSERT INTO notifications') && sql.includes('delivery_overdue_reminder')) {
    server\services\__tests__\proactiveOverduePush.test.ts:99:      { request_id: 'req_53203889', type: 'delivery_overdue', notificationId: expect.stringMatching(/^notif_/) },
    server\services\__tests__\proactiveOverduePush.test.ts:116:      { request_id: 'req_53203889', type: 'delivery_at_risk', notificationId: expect.stringMatching(/^notif_/) },
    server\services\__tests__\proactiveOverduePush.test.ts:132:      { request_id: 'req_53203889', type: 'delivery_overdue_reminder', notificationId: expect.stringMatching(/^notif_/) },
    mobile-app\services\__tests__\registerFcmBackgroundHandler.test.ts:3:describe('FCM background handler registration', () => {
    server\services\deliveryNotifications.ts:27:export async function publishSavedWebPushNotification(notification: DeliveryNotification): Promise<void> {
    server\services\deliveryNotifications.ts:28:  if (!isPotentialWebPushType(notification.type)) return;
    server\services\deliveryNotifications.ts:30:    await enqueueWebPush(notification.id);
    server\services\deliveryNotifications.ts:32:    console.error('[WEB PUSH] Queueing saved notification failed.');
    server\services\deliveryNotifications.ts:40:  const notification: DeliveryNotification = {
    server\services\deliveryNotifications.ts:48:    'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\services\deliveryNotifications.ts:49:    [notification.id, notification.user_id, notification.message, notification.type, notification.request_id],
    server\services\deliveryNotifications.ts:51:  return notification;
    server\services\deliveryNotifications.ts:59:  const notifications: DeliveryNotification[] = [];
    server\services\deliveryNotifications.ts:61:    notifications.push(await persistDeliveryNotification(executor, {
    server\services\deliveryNotifications.ts:68:  return notifications;
    server\services\deliveryNotifications.ts:73:  notification: DeliveryNotification,
    server\services\deliveryNotifications.ts:76:  io?.to(notification.user_id).emit('notification-added', notification);
    server\services\deliveryNotifications.ts:77:  await publishSavedWebPushNotification(notification);
    server\services\deliveryNotifications.ts:81:      notification.user_id,
    server\services\deliveryNotifications.ts:84:      { ...options.push.data, notificationId: notification.id },
    server\services\deliveryNotifications.ts:88:    console.error(`[DELIVERY NOTIFICATION] Push failed for ${notification.request_id}:`, error);
    mobile-app\services\pushTokenService.ts:12:  await api.post('/api/notifications/register-token', { token, provider: 'fcm', platform });
    mobile-app\services\pushTokenService.ts:36:  await api.post('/api/notifications/unregister-token', { provider: 'fcm' });
    mobile-app\coverage\lcov-report\mobile-app\hooks\index.html:112:    <td class="file low" data-value="use-push-notifications.ts"><a href="use-push-notifications.ts.html">use-push-notifications.ts</a></td>
    mobile-app\context\__tests__\avatar.test.tsx:69:it('unregisters the rider FCM token before clearing the session on logout', async () => {
    src\app\pages\Admin\DispatchConsole.tsx:202:    socket.on('notification-added', (notif: any) => {
    src\app\pages\Admin\DispatchConsole.tsx:203:      // Refresh if it's an attendance or duty related notification
    src\app\pages\Admin\DispatchConsole.tsx:224:      socket.off('notification-added');
    src\app\context\DataContext.tsx:16:import { getRequestUpdateToast } from "../utils/notificationMessages";
    src\app\context\DataContext.tsx:22:  notifications: Notification[]; globalStats: { pending: number; active: number; done: number; overdue: number };
    src\app\context\DataContext.tsx:51:  markNotificationRead: (notificationId: string) => Promise<void>;
    src\app\context\DataContext.tsx:72:  const [notifications, setNotifications] = useState<Notification[]>([]);
    src\app\context\DataContext.tsx:224:    return fetchWithAuth(`${API_URL}/notifications`).then(async res => {
    src\app\context\DataContext.tsx:233:      console.error("Failed to fetch notifications", err);
    src\app\context\DataContext.tsx:381:    socket.on("notification-added", () => {
    src\app\context\DataContext.tsx:398:      socket.off("notification-added");
    src\app\context\DataContext.tsx:724:  const markNotificationRead = async (notificationId: string) => {
    src\app\context\DataContext.tsx:726:      await fetchWithAuth(`${API_URL}/notifications/${notificationId}/read`, {
    src\app\context\DataContext.tsx:743:      await fetchWithAuth(`${API_URL}/notifications/read-all/${user.id}`, {
    src\app\context\DataContext.tsx:761:        notifications,
    mobile-app\services\__tests__\pushTokenService.test.ts:6:describe('FCM push token service', () => {
    mobile-app\services\__tests__\pushTokenService.test.ts:14:    expect(api.post).toHaveBeenCalledWith('/api/notifications/register-token', {
    mobile-app\services\__tests__\pushTokenService.test.ts:26:  it('unregisters the authenticated device FCM token', async () => {
    mobile-app\services\__tests__\pushTokenService.test.ts:28:    expect(api.post).toHaveBeenCalledWith('/api/notifications/unregister-token', { provider: 'fcm' });
    mobile-app\services\__tests__\pushTokenService.test.ts:45:    expect(api.post).toHaveBeenCalledWith('/api/notifications/register-token', {
    server\services\__tests__\messaging.test.ts:289:  it('returns the canonical message for a repeated client message id without another notification', async () => {
    server\services\__tests__\messaging.test.ts:311:    expect(connection.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO notifications'))).toBe(false);
    ✗ (1) • 2.29s

## Activity

    $ rg -n "register-token|unregister-token|sendPush|send.*Fcm|fcm_tokens|push_tokens|router\.|initializeApp|getMessaging|start.*Worker" server/routes/notifications.ts server/services/fcm.ts server/index.ts server/services/proactiveOverdue.ts server/db.ts; Get-Content server/services/fcm.ts; rg -n "AdminLayout|Attendance|Notifications|sidebar|navItems|menuItems" src/app/pages/Admin src/app/components/Admin src/app/routes.tsx | Select-Object -First 250
    server/services/fcm.ts:1:import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
    server/services/fcm.ts:2:import { getMessaging, type Messaging } from 'firebase-admin/messaging';
    server/services/fcm.ts:18:  const app = existingApp || initializeApp({
    server/services/fcm.ts:24:  return getMessaging(app);
    server/services/fcm.ts:34:export async function sendFcmNotification(
    server/services/proactiveOverdue.ts:4:import { sendPushNotification } from '../routes/notifications';
    server/services/proactiveOverdue.ts:155:      void sendPushNotification(
    server/services/proactiveOverdue.ts:186:export const startProactiveOverdueWorker = (io: Server) => {
    server/routes/notifications.ts:17:import { isPermanentFcmTokenError, sendFcmNotification } from '../services/fcm';
    server/routes/notifications.ts:63:router.get('/web-push/config', async (_req, res) => {
    server/routes/notifications.ts:67:router.get('/web-push/status', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
    server/routes/notifications.ts:78:router.post('/web-push/status', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
    server/routes/notifications.ts:98:router.post('/web-push/subscribe', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
    server/routes/notifications.ts:116:router.delete('/web-push/subscribe', authorize(['admin', 'personnel']), async (req: AuthRequest, res) => {
    server/routes/notifications.ts:133:export async function sendPushNotification(
    server/routes/notifications.ts:157:        await sendFcmNotification(fcmToken, {
    server/routes/notifications.ts:194:      await expo.sendPushNotificationsAsync(chunk);
    server/routes/notifications.ts:203:router.post('/register-token', async (req, res) => {
    server/routes/notifications.ts:225:router.post('/unregister-token', async (req, res) => {
    server/routes/notifications.ts:243:router.get('/', async (req: AuthRequest, res: Response) => {
    server/routes/notifications.ts:261:router.post('/', notificationCreateLimiter, authorize(['admin']), async (req, res) => {
    server/routes/notifications.ts:287:    await sendPushNotification(user_id, title, message, { notificationId: id, request_id: requestId, type });
    server/routes/notifications.ts:297:router.put('/:id/read', async (req, res) => {
    server/routes/notifications.ts:312:router.put('/read-all/:userId', async (req, res) => {
    server/index.ts:31:import { ensureWebPushTable, startWebPushWorker } from './services/webPush';
    server/index.ts:37:import { startProactiveOverdueWorker } from './services/proactiveOverdue';
    server/index.ts:39:import { startShiftCutoffWorker } from './services/shiftCutoff';
    server/index.ts:553:  .then(() => startWebPushWorker())
    server/index.ts:579:startProactiveOverdueWorker(io);
    server/index.ts:581:  .then(() => startShiftCutoffWorker(pool, io))
    import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
    import { getMessaging, type Messaging } from 'firebase-admin/messaging';
    
    export type FcmPriority = 'high' | 'normal';
    
    export type FcmNotification = {
      title: string;
      body: string;
      data?: Record<string, unknown>;
      channelId?: string;
      categoryId?: string;
      tag?: string;
      priority?: FcmPriority;
    };
    
    function getFirebaseMessaging(): Messaging {
      const existingApp = getApps()[0];
      const app = existingApp || initializeApp({
        ...(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : {}),
        credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
          ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
          : applicationDefault(),
      });
      return getMessaging(app);
    }
    
    function toFcmData(data?: Record<string, unknown>): Record<string, string> | undefined {
      if (!data) return undefined;
      return Object.fromEntries(Object.entries(data)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
    }
    
    export async function sendFcmNotification(
      token: string,
      notification: FcmNotification,
      messaging: Pick<Messaging, 'send'> = getFirebaseMessaging(),
    ): Promise<string> {
      const priority = notification.priority || 'high';
      return messaging.send({
        token,
        notification: { title: notification.title, body: notification.body },
        ...(notification.data ? { data: toFcmData(notification.data) } : {}),
        android: {
          priority,
          notification: {
            channelId: notification.channelId || 'default',
            ...(notification.tag ? { tag: notification.tag } : {}),
          },
        },
        apns: {
          headers: { 'apns-priority': priority === 'high' ? '10' : '5' },
          payload: {
            aps: {
              sound: 'default',
              ...(notification.categoryId ? { category: notification.categoryId } : {}),
              ...(notification.tag ? { threadId: notification.tag } : {}),
            },
          },
        },
      });
    }
    
    export function isPermanentFcmTokenError(error: unknown): boolean {
      const code = (error as { code?: string } | null)?.code;
      return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
    }
    src/app/pages/Admin\AdminLayout.tsx:26:const AttendanceDashboard = lazy(() => import('./AttendanceDashboard').then(module => ({ default: module.AttendanceDashboard })));
    src/app/pages/Admin\AdminLayout.tsx:37:  { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    src/app/pages/Admin\AdminLayout.tsx:42:export function AdminLayout() {
    src/app/pages/Admin\AdminLayout.tsx:219:                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
    src/app/pages/Admin\AdminLayout.tsx:226:                   System / <span className="text-slate-900">{currentView === 'calendar' ? 'Task Schedule' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Accounts' : currentView === 'analytics' ? 'Analytics' : currentView === 'attendance' ? 'Rider Attendance' : 'Themes'}</span>
    src/app/pages/Admin\AdminLayout.tsx:230:              {/* Global Actions (Notifications) */}
    src/app/pages/Admin\AdminLayout.tsx:280:            {currentView === 'shift-hours' && <ShiftHours onOpenAttendance={() => setCurrentView('attendance')} />}
    src/app/pages/Admin\AdminLayout.tsx:282:            {currentView === 'attendance' && <AttendanceDashboard />}
    src/app/pages/Admin\ShiftHours.tsx:8:export function ShiftHours({ onOpenAttendance }: { onOpenAttendance: () => void }) {
    src/app/pages/Admin\ShiftHours.tsx:96:        <button type="button" onClick={onOpenAttendance} className="mt-3 min-h-11 rounded-lg border border-amber-500 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Open Attendance</button>
    src/app/pages/Admin\DispatchConsole.tsx:745:        {/* Mobile flow: AdminLayout provides the mobile header, followed by tabs, cards, and details. */}
    src/app/pages/Admin\AttendanceDashboard.tsx:52:interface AttendanceRecord {
    src/app/pages/Admin\AttendanceDashboard.tsx:74:export const AttendanceDashboard: React.FC = () => {
    src/app/pages/Admin\AttendanceDashboard.tsx:77:  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    src/app/pages/Admin\AttendanceDashboard.tsx:79:  const [attendanceError, setAttendanceError] = useState<string | null>(null);
    src/app/pages/Admin\AttendanceDashboard.tsx:109:  const fetchAttendance = useCallback(async (silent = false) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:117:      if (!res.ok) throw new Error(data?.error || `Attendance request failed (${res.status})`);
    src/app/pages/Admin\AttendanceDashboard.tsx:118:      if (!Array.isArray(data)) throw new Error('Attendance service returned an invalid response');
    src/app/pages/Admin\AttendanceDashboard.tsx:120:      setAttendance(data);
    src/app/pages/Admin\AttendanceDashboard.tsx:121:      setAttendanceError(null);
    src/app/pages/Admin\AttendanceDashboard.tsx:125:      setAttendanceError(message);
    src/app/pages/Admin\AttendanceDashboard.tsx:127:      if (!silent) setAttendance([]);
    src/app/pages/Admin\AttendanceDashboard.tsx:137:  useEffect(() => { void fetchAttendance(); }, [fetchAttendance]);
    src/app/pages/Admin\AttendanceDashboard.tsx:158:      console.log('🔄 AttendanceDashboard: Real-time update detected, syncing...');
    src/app/pages/Admin\AttendanceDashboard.tsx:163:      fetchAttendance(true); // Silent refresh
    src/app/pages/Admin\AttendanceDashboard.tsx:173:  }, [socket, fetchAttendance]);
    src/app/pages/Admin\AttendanceDashboard.tsx:183:  const filteredAttendance = attendance.filter(a =>
    src/app/pages/Admin\AttendanceDashboard.tsx:188:  const formatShiftStart = (record: AttendanceRecord) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:193:  const formatShiftEnd = (record: AttendanceRecord) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:214:        fetchAttendance();
    src/app/pages/Admin\AttendanceDashboard.tsx:221:  const approveLateCheckIn = async (record: AttendanceRecord) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:233:      await fetchAttendance(true);
    src/app/pages/Admin\AttendanceDashboard.tsx:246:  const getStatusBadge = (record: AttendanceRecord) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:331:              Rider Attendance
    src/app/pages/Admin\AttendanceDashboard.tsx:355:              onClick={() => void fetchAttendance()}
    src/app/pages/Admin\AttendanceDashboard.tsx:366:            <Button type="button" variant="outline" size="sm" onClick={() => void fetchAttendance()} className="shrink-0 border-rose-200 text-rose-800">Retry</Button>
    src/app/pages/Admin\AttendanceDashboard.tsx:371:        <div aria-label="Attendance summary" role="group" className="grid grid-cols-5 gap-1 mt-3 sm:mt-8 sm:gap-4">
    src/app/pages/Admin\AttendanceDashboard.tsx:402:        <Card role="region" aria-label="Attendance records" className="flex-1 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-300/50 flex flex-col overflow-hidden">
    src/app/pages/Admin\AttendanceDashboard.tsx:406:              <h2 className="text-sm sm:text-base font-black text-slate-900">Attendance records</h2>
    src/app/pages/Admin\AttendanceDashboard.tsx:408:                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tabular-nums text-slate-600">{filteredAttendance.length}</span>
    src/app/pages/Admin\AttendanceDashboard.tsx:465:                <p className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Attendance unavailable</p>
    src/app/pages/Admin\AttendanceDashboard.tsx:467:            ) : filteredAttendance.length === 0 ? (
    src/app/pages/Admin\AttendanceDashboard.tsx:473:              filteredAttendance.map((record) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:602:                      <p className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Attendance unavailable</p>
    src/app/pages/Admin\AttendanceDashboard.tsx:605:                ) : filteredAttendance.length === 0 ? (
    src/app/pages/Admin\AttendanceDashboard.tsx:613:                  filteredAttendance.map((record) => {
    src/app/pages/Admin\AttendanceDashboard.tsx:757:          onSuccess={fetchAttendance}
    src/app/components/Admin\NotificationBell.tsx:13:  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
    src/app/components/Admin\NotificationBell.tsx:19:  const myNotifications = (Array.isArray(notifications) ? notifications : []).filter(n => {
    src/app/components/Admin\NotificationBell.tsx:23:  const unreadCount = myNotifications.filter(n => !n.read).length;
    src/app/components/Admin\NotificationBell.tsx:59:          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    src/app/components/Admin\NotificationBell.tsx:76:              <SheetTitle className="text-sm font-black uppercase tracking-widest">Notifications</SheetTitle>
    src/app/components/Admin\NotificationBell.tsx:84:                onClick={() => markAllNotificationsRead()}
    src/app/components/Admin\NotificationBell.tsx:97:          {myNotifications.length === 0 ? (
    src/app/components/Admin\NotificationBell.tsx:105:            myNotifications.map(notification => (
    src/app/components/Admin\ConflictResolutionModal.tsx:151:        <div className="p-5 space-y-5 overflow-y-auto custom-sidebar-scrollbar flex-1">
    src/app/components/Admin\ConflictResolutionModal.tsx:170:                <div className="max-h-[220px] overflow-auto space-y-2 pr-1 custom-sidebar-scrollbar">
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx:17:vi.mock('../AttendanceDashboard', () => ({ AttendanceDashboard: () => null }));
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx:20:import { AdminLayout } from '../AdminLayout';
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx:22:describe('admin sidebar navigation order', () => {
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx:24:    render(<MemoryRouter><AdminLayout /></MemoryRouter>);
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx:35:      'Attendance',
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx:15:import { AttendanceDashboard } from '../AttendanceDashboard';
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx:42:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx:61:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx:75:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx:87:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-date-rollover.test.tsx:4:import { AttendanceDashboard } from '../AttendanceDashboard';
    src/app/pages/Admin\__tests__\attendance-date-rollover.test.tsx:21:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-duty.test.tsx:14:import { AttendanceDashboard } from '../AttendanceDashboard';
    src/app/pages/Admin\__tests__\attendance-duty.test.tsx:24:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-duty.test.tsx:45:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-handover.test.tsx:4:import { AttendanceDashboard } from '../AttendanceDashboard';
    src/app/pages/Admin\__tests__\attendance-handover.test.tsx:22:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:4:import { AttendanceDashboard } from '../AttendanceDashboard';
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:23:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:39:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:54:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:67:  render(<AttendanceDashboard />);
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx:82:  render(<AttendanceDashboard />);
    ✓ • 200ms

## Assistant

# Campaign Notification Implementation Plan

The system already supports Firebase device-token registration and FCM delivery. We should extend that infrastructure with an admin-managed campaign scheduler instead of relying on Firebase Console campaigns.

## 1. Admin Campaign Page

Add a **Notification Campaigns** section to the web-admin sidebar.

Admin can:

- Create, edit, duplicate, pause, resume, and cancel campaigns
- Enter notification title and message
- Send a test notification
- Select recipients:

  - All riders
  - Selected riders
  - Riders without attendance
  - Absent riders
  - On-duty or off-duty riders
  - Riders with active/overdue tasks

- Configure timing:

  - Send immediately
  - One-time scheduled notification
  - Recurring on selected weekdays
  - Start and end dates
  - Philippine time
  - Repeat every specified number of minutes
  - Maximum notifications per rider

- Configure stop conditions:

  - Rider starts their shift
  - Rider reports absence or leave
  - Rider completes their tasks
  - Campaign reaches its end date
  - Admin manually stops it

## 2. Database Changes

Create the following tables:

### `notification_campaigns`

Stores the campaign definition:

- Campaign name
- Notification title and message
- Status: `draft`, `scheduled`, `active`, `paused`, `completed`, `cancelled`
- Target type and target rules
- Start and end dates
- Send time
- Time zone
- Selected weekdays
- Repeat interval
- Maximum sends per rider
- Stop-condition configuration
- Deep-link destination
- Created and updated by
- Created and updated timestamps

### `notification_campaign_recipients`

Used for campaigns targeting selected riders:

- Campaign ID
- Rider ID

### `notification_campaign_deliveries`

Stores every planned and attempted delivery:

- Campaign ID
- Rider ID
- Scheduled time
- Attempt number
- Delivery status: `pending`, `processing`, `sent`, `failed`, `skipped`
- FCM message ID
- Failure reason
- Sent timestamp
- Idempotency key

This table prevents duplicate notifications when the worker restarts.

## 3. Server API

Add admin-only endpoints:

```text
GET    /api/notification-campaigns
GET    /api/notification-campaigns/:id
POST   /api/notification-campaigns
PATCH  /api/notification-campaigns/:id
POST   /api/notification-campaigns/:id/activate
POST   /api/notification-campaigns/:id/pause
POST   /api/notification-campaigns/:id/resume
POST   /api/notification-campaigns/:id/cancel
POST   /api/notification-campaigns/:id/test
GET    /api/notification-campaigns/:id/deliveries
```

All modifying endpoints must:

- Require the admin role
- Validate schedules and recipient rules
- Use Asia/Manila as the default time zone
- Record the administrator in the audit log
- Reject invalid dates, intervals, and notification limits

## 4. Campaign Scheduler

Create a background campaign worker following the existing shift-cutoff and overdue-worker patterns.

The worker should run every minute:

```text
Find due campaigns
    ↓
Find currently eligible riders
    ↓
Check campaign stop conditions
    ↓
Check rider send limit
    ↓
Reserve delivery using an idempotency key
    ↓
Create in-app notification record
    ↓
Send through existing FCM service
    ↓
Record success, failure, or skip
    ↓
Calculate the next scheduled run
```

Important requirements:

- Multiple server instances must not send duplicates.
- A delivery must be reserved transactionally before sending.
- Failed notifications may retry with a limited backoff.
- Invalid FCM tokens should continue to be removed using the existing behavior.
- Paused or cancelled campaigns must not create new deliveries.
- A campaign must never exceed its per-rider notification limit.

## 5. Dynamic Recipient Evaluation

Recipients should be checked at send time—not only when the campaign is created.

Example:

```text
Campaign target: Riders without attendance
Scheduled sends: 7:45, 8:00, and 8:15 AM

7:45 — Rider receives reminder
7:50 — Rider starts shift
8:00 — Worker detects Present/Open Shift and skips rider
8:15 — Rider remains excluded
```

This prevents unnecessary notifications after the rider has already acted.

## 6. Firebase Delivery

Reuse the existing:

- FCM token registration
- Firebase Admin SDK
- `sendFcmNotification`
- Invalid-token cleanup
- Foreground/background mobile notification handling

Campaign payload example:

```json
{
  "type": "campaign",
  "campaignId": "campaign_123",
  "notificationId": "notif_456",
  "screen": "attendance"
}
```

Initially send messages per rider through existing token handling. Batched FCM delivery can be added later if volume requires it.

## 7. Mobile Rider Behavior

When a campaign notification arrives:

- Show it in the Android/iOS notification tray.
- Store it in the rider’s existing notification inbox.
- Opening it navigates to the configured screen:

  - Attendance/shift controls
  - Today’s tasks
  - Overdue tasks
  - Inbox
  - General dashboard

The app should safely ignore unknown or expired destinations and open the dashboard instead.

## 8. Admin Reporting

Each campaign should display:

- Campaign status
- Targeted rider count
- Sent count
- Failed count
- Skipped count
- Riders who acted after receiving it
- Next scheduled send
- Campaign delivery history

“Acted” can initially mean:

- Started shift
- Reported absence/leave
- Completed a targeted task

Exact Firebase notification-open analytics can be a later enhancement.

## 9. Validation and Safety Rules

Apply these initial limits:

- Maximum message length
- Minimum repeat interval, such as 5 minutes
- Maximum sends per rider per campaign
- Maximum campaign duration
- No schedule in the past
- Confirmation before activating or cancelling
- Test-send required or strongly recommended before activation
- Do not include sensitive delivery/customer information in push text
- All scheduling stored consistently and displayed in Philippine time

## 10. Testing

### Server tests

- Campaign creation and validation
- Admin-only authorization
- Correct weekday and time calculations
- One-time and recurring campaigns
- Dynamic rider targeting
- Stop conditions
- Maximum-send enforcement
- Pause, resume, and cancellation
- Duplicate-worker protection
- Retry behavior
- Invalid FCM-token cleanup
- Audit-log creation

### Admin UI tests

- Campaign form validation
- Recipient-rule selection
- Schedule preview
- Test notification
- Status actions
- Delivery report display
- Mobile-responsive layout

### Mobile tests

- Foreground notification display
- Background notification display
- Campaign deep links
- Notification inbox entry
- Safe handling of missing or unknown payloads

### End-to-end test

```text
Admin creates morning reminder
→ Campaign becomes active
→ Eligible rider receives notification
→ Rider opens notification
→ Rider starts shift
→ Later campaign repetitions skip that rider
→ Admin report shows sent and skipped results
```

## 11. Delivery Phases

### Phase 1: Core campaign system

- Database tables
- Admin CRUD endpoints
- One-time and weekday schedules
- All-rider and selected-rider targeting
- Campaign worker
- Existing FCM integration
- Delivery history

### Phase 2: Operational targeting

- No-attendance targeting
- Absent/on-duty/off-duty targeting
- Active and overdue-task targeting
- Stop conditions
- Deep links

### Phase 3: Reporting and refinement

- Campaign dashboard
- Action/conversion tracking
- Duplicate campaign function
- Templates
- Retry visibility
- Exportable delivery reports

## Recommended first campaign

Use the morning attendance reminder as the first production use case:

```text
Name: Morning Shift Reminder
Target: Riders without attendance
Days: Monday–Friday
First send: 15 minutes before shift
Repeat: Every 10 minutes
Maximum: 3 notifications per rider
Stop when: Present, absent, or on leave
Destination: Rider shift controls
```

This is the best initial campaign because it integrates directly with the attendance and shift states already available in the system.

## User

make it in phases plan max of 3

## Assistant

## Phase 1: Campaign Foundation

- Add **Notification Campaigns** to the web-admin sidebar.
- Allow admins to create, edit, activate, pause, cancel, and duplicate campaigns.
- Support notification title, message, test send, selected recipients, date, time, weekdays, repeat interval, and maximum send count.
- Create campaign, recipient, and delivery-history database tables.
- Add secured admin campaign APIs.

## Phase 2: Scheduling and Firebase Delivery

- Add a background worker that checks due campaigns every minute.
- Dynamically select eligible riders before every send.
- Send notifications using the existing Firebase/FCM infrastructure.
- Add recurring schedules and limits per rider.
- Prevent duplicate deliveries.
- Retry temporary failures and remove invalid FCM tokens.
- Store notifications in the rider inbox.
- Support deep links to Attendance, Today’s Tasks, Overdue Tasks, or Inbox.
- Stop reminders when the rider completes the required action.

## Phase 3: Reporting, Testing, and Rollout

- Show sent, failed, skipped, and pending delivery counts.
- Display per-rider delivery history and next scheduled send.
- Record admin campaign actions in the audit log.
- Test permissions, schedules, targeting, stop conditions, retries, duplicate prevention, and mobile deep links.
- Run the complete quality gate: lint → typecheck → test → build.
- Roll out first with a **Morning Shift Reminder** campaign, monitor results, then enable other campaign types.

## User

write a plan of this 3 phases

## Assistant

# Notification Campaign Implementation Plan

## Phase 1: Campaign Foundation

### Objective

Allow administrators to create and manage notification campaigns from the web application.

### Backend

- Create `notification_campaigns` table containing:

  - Campaign name
  - Notification title and message
  - Campaign status
  - Target type
  - Start and end dates
  - Send time
  - Selected weekdays
  - Repeat interval
  - Maximum sends per rider
  - Deep-link destination
  - Creator and timestamps

- Create `notification_campaign_recipients` for campaigns targeting selected riders.
- Create `notification_campaign_deliveries` for delivery history and duplicate prevention.
- Add admin-only API endpoints to:

  - List and view campaigns
  - Create and update campaigns
  - Activate, pause, resume, cancel, and duplicate campaigns
  - Send a test notification
  - View campaign deliveries

- Validate dates, times, repeat limits, message length, and recipient settings.
- Use `Asia/Manila` as the default campaign time zone.
- Record campaign changes in the system audit log.

### Web Admin

- Add **Notification Campaigns** to the admin sidebar.
- Create a campaign list showing:

  - Name
  - Status
  - Target audience
  - Schedule
  - Next send
  - Basic delivery counts

- Create a campaign form with:

  - Campaign name
  - Notification title and message
  - Recipient selection
  - One-time or recurring schedule
  - Weekday selection
  - Repeat interval
  - Maximum send count
  - Deep-link destination

- Add confirmation prompts before activation and cancellation.

### Testing

- Database migration tests
- Admin authorization tests
- API validation tests
- Campaign form tests
- Campaign status-transition tests
- Responsive admin-page tests

### Phase 1 completion criteria

An admin can create, edit, test, activate, pause, resume, duplicate, and cancel a valid campaign. No scheduled notifications are automatically sent yet.

---

## Phase 2: Scheduling and Firebase Delivery

### Objective

Automatically process active campaigns and send Firebase notifications to eligible riders.

### Campaign Worker

- Create a background worker that runs every minute.
- Find campaigns whose next delivery time is due.
- Support:

  - Immediate campaigns
  - One-time scheduled campaigns
  - Selected weekday campaigns
  - Repeated notifications
  - Start and end dates
  - Maximum sends per rider

- Evaluate recipients again before every send.
- Use database transactions and idempotency keys to prevent duplicate delivery.
- Lock or reserve each delivery before contacting Firebase.
- Retry temporary delivery failures with a limited backoff.
- Mark permanent failures without retrying indefinitely.

### Recipient Targeting

Support these audiences:

- All riders
- Selected riders
- Riders without attendance
- Present riders
- Absent or on-leave riders
- On-duty or off-duty riders
- Riders with active tasks
- Riders with overdue tasks

### Stop Conditions

Allow campaigns to stop sending to an individual rider when:

- Attendance is recorded
- The shift is started
- Absence or leave is reported
- Targeted tasks are completed
- Maximum sends are reached
- The campaign is paused, completed, or cancelled

### Firebase and Mobile App

- Reuse the existing FCM token registration and Firebase Admin service.
- Remove invalid tokens using the existing cleanup behavior.
- Save every campaign message in the rider’s notification inbox.
- Send custom payload data containing:

  - Campaign ID
  - Notification ID
  - Notification type
  - Destination screen

- Support deep links to:

  - Shift and attendance controls
  - Today’s tasks
  - Overdue tasks
  - Inbox
  - Rider dashboard

- Fall back to the dashboard when the destination is invalid.
- Display notifications correctly when the app is foregrounded, backgrounded, or closed.

### Testing

- One-time schedule tests
- Recurring schedule and weekday tests
- Philippine-time boundary tests
- Dynamic-recipient tests
- Stop-condition tests
- Maximum-send tests
- Duplicate-worker tests
- Firebase failure and retry tests
- Invalid-token cleanup tests
- Mobile foreground/background notification tests
- Deep-link tests

### Phase 2 completion criteria

An active campaign automatically sends notifications at the correct times, respects targeting and limits, avoids duplicates, and stops sending when the rider completes the required action.

---

## Phase 3: Reporting, Hardening, and Rollout

### Objective

Give administrators campaign visibility and prepare the feature for production use.

### Campaign Reporting

Display:

- Pending deliveries
- Successful sends
- Failed sends
- Skipped recipients
- Total targeted riders
- Sends per rider
- Next scheduled delivery
- Last execution time
- Failure reasons
- Campaign completion status

Add a per-rider delivery history containing:

- Rider
- Scheduled time
- Attempt number
- Delivery result
- Firebase message ID
- Skip or failure reason
- Sent timestamp

### Action Tracking

Track whether a rider acted after receiving a campaign:

- Started shift
- Submitted attendance
- Reported absence or leave
- Completed a targeted task
- Opened the linked screen, when supported

Initially, action tracking should use existing system records. Firebase open-rate analytics can be added later.

### Production Hardening

- Add rate limits and maximum campaign sizes.
- Limit the minimum repeat interval.
- Restrict the maximum number of sends per rider.
- Prevent sensitive customer information from appearing in push messages.
- Add structured worker logs and error monitoring.
- Ensure multiple server instances cannot process the same delivery.
- Add retention or cleanup rules for old delivery records.
- Document Firebase credentials and deployment requirements.
- Provide a manual worker-health indicator for administrators.

### Quality Gate

Run and pass the complete project quality sequence:

1. Lint
2. Typecheck
3. Tests
4. Production build
5. End-to-end campaign test
6. Update the Graphify knowledge graph

### Initial Rollout

Release the feature using one controlled campaign:

**Morning Shift Reminder**

- Audience: Riders without attendance
- Schedule: Monday–Friday
- First send: 15 minutes before shift start
- Repeat: Every 10 minutes
- Maximum: Three notifications per rider
- Stop when: Rider becomes present, absent, or on leave
- Destination: Shift controls

Monitor delivery failures, invalid tokens, duplicate sends, and rider response before enabling other campaign types.

### Phase 3 completion criteria

Admins can monitor campaign performance and delivery history, production safeguards are active, all quality checks pass, and the Morning Shift Reminder runs successfully without duplicate or unnecessary notifications.

## User

in quality gate, remove the lint, production build, end to end campaing test. then write here the plan of the phases

## Assistant

# Notification Campaign Implementation Plan

## Phase 1: Campaign Foundation

### Objective

Allow administrators to create and manage notification campaigns through the web application.

### Tasks

- Add **Notification Campaigns** to the admin sidebar.
- Create database tables for:

  - Campaign information and schedule
  - Selected campaign recipients
  - Notification delivery history

- Build admin-only APIs for:

  - Creating and editing campaigns
  - Activating, pausing, resuming, cancelling, and duplicating campaigns
  - Sending test notifications
  - Viewing campaign details and delivery history

- Build the admin campaign interface with:

  - Campaign name
  - Notification title and message
  - Recipient selection
  - One-time or recurring schedule
  - Date and weekday selection
  - Philippine send time
  - Repeat interval
  - Maximum notifications per rider
  - Mobile destination screen

- Validate campaign schedules, recipient settings, message length, and repetition limits.
- Record campaign changes in the system audit log.

### Completion criteria

An administrator can create, edit, test, activate, pause, resume, duplicate, and cancel a campaign. Automatic scheduled delivery is not enabled yet.

---

## Phase 2: Scheduling and Firebase Delivery

### Objective

Automatically send campaign notifications to eligible riders using the existing Firebase infrastructure.

### Tasks

- Create a background worker that checks for due campaigns every minute.
- Support:

  - Immediate notifications
  - One-time scheduled notifications
  - Recurring weekday notifications
  - Start and end dates
  - Repeat intervals
  - Maximum sends per rider

- Support these recipient groups:

  - All riders
  - Selected riders
  - Riders without attendance
  - Present riders
  - Absent or on-leave riders
  - On-duty or off-duty riders
  - Riders with active or overdue tasks

- Recheck rider eligibility before every notification.
- Stop sending when:

  - Attendance is submitted
  - The rider starts their shift
  - The rider reports absence or leave
  - Targeted tasks are completed
  - The maximum send limit is reached
  - The campaign is paused or cancelled

- Prevent duplicate notifications using database transactions and idempotency keys.
- Retry temporary Firebase failures with a limited backoff.
- Remove invalid FCM tokens.
- Store each campaign notification in the rider’s notification inbox.
- Support notification links to:

  - Shift and attendance controls
  - Today’s tasks
  - Overdue tasks
  - Inbox
  - Rider dashboard

- Fall back to the rider dashboard if a destination is invalid.

### Completion criteria

Active campaigns send notifications at the correct Philippine date and time, observe recipient and repetition rules, avoid duplicates, and stop when the rider completes the expected action.

---

## Phase 3: Reporting, Quality Gate, and Rollout

### Objective

Provide campaign monitoring, strengthen reliability, and prepare the feature for actual use.

### Reporting

- Display campaign statistics:

  - Targeted riders
  - Pending notifications
  - Successful sends
  - Failed sends
  - Skipped sends
  - Next scheduled delivery
  - Last worker execution

- Display per-rider delivery history:

  - Rider name
  - Scheduled time
  - Attempt number
  - Delivery result
  - Firebase message ID
  - Failure or skip reason
  - Sent time

- Track whether riders acted after receiving a notification:

  - Started their shift
  - Submitted attendance
  - Reported absence or leave
  - Completed a targeted task

### Reliability and Security

- Apply campaign and notification rate limits.
- Set a minimum repeat interval.
- Set a maximum number of notifications per rider.
- Prevent sensitive customer information from being included in push messages.
- Ensure multiple server instances cannot process the same notification.
- Add worker error logs and health monitoring.
- Add cleanup or retention rules for old delivery records.
- Document Firebase credentials and deployment configuration.

### Quality Gate

Run and pass:

1. Typecheck
2. Tests
3. Update the Graphify knowledge graph

If typecheck or tests fail, fix the issue and rerun the complete sequence.

### Initial Rollout

Launch the feature with a controlled **Morning Shift Reminder** campaign:

- Recipients: Riders without attendance
- Days: Monday–Friday
- First notification: 15 minutes before shift start
- Repeat interval: Every 10 minutes
- Maximum: Three notifications per rider
- Stop when: Rider becomes present, absent, or on leave
- Destination: Mobile shift controls

Monitor failed deliveries, invalid device tokens, duplicate notifications, and rider responses before allowing other campaign types.

### Completion criteria

Administrators can review campaign performance and delivery history, all quality checks pass, and the Morning Shift Reminder runs successfully without duplicate or unnecessary notifications.

## User

implement phase 1

## Assistant

I’m implementing Phase 1 as approved: database foundation, admin-only campaign APIs, audit entries, and the web-admin campaign management UI—without the automatic scheduler. I’ll follow the repository’s existing migration and admin-page patterns, then use the required quality-gate skill for the project checks.

## Activity

    $ Get-Content -Raw '.agents/skills/quality-gate/SKILL.md'; git status --short; rg --files server | rg "(schema|migration|scripts|routes|audit)"; rg --files src/app/pages/Admin src/app/components/Admin | Select-Object -First 200; Get-Content package.json
    ---
    name: quality-gate
    description: Use when code changes are ready for validation, before claiming a feature is complete or handing work back for review.
    ---
    
    # Quality Gate
    
    Run the affected package checks in this order:
    
    1. **Lint** â€” use the package's lint script.
    2. **Typecheck** â€” use the package's typecheck script, or `npx tsc --noEmit` when the package has TypeScript but no script.
    3. **Test** â€” run the package test script, preferably in CI/non-watch mode.
    4. **Build** â€” run the package build script or its documented framework equivalent.
    
    Use the smallest set of affected packages, but include every package touched by the change. In this repository:
    
    - Root web/server: `npm run build` is the available build command. Use the package's existing lint/test commands when present.
    - `mobile-app`: run `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, then `npx expo export --platform web` unless a more specific release build is required.
    
    Do not install dependencies, change scripts, or weaken checks to make the gate pass without user authorization. Stop at the first failed stage, fix the cause, then rerun the full sequence from lint. If a required command does not exist, report it explicitly and run the closest supported equivalent; never imply that stage passed.
    
    Final reports must name each command, its result, and any pre-existing or unrelated failures. Only call the change complete when all applicable stages have fresh passing evidence.
    
    warning: in the working copy of 'eas.json', LF will be replaced by CRLF the next time Git touches it
    warning: in the working copy of 'eas.json', LF will be replaced by CRLF the next time Git touches it
     M .env.example
     M docs/superpowers/plans/2026-10-21-rider-connectivity-and-offline-sync.md
     A eas.json
     M graphify-out/.graphify_labels.json
     M graphify-out/GRAPH_REPORT.md
     M graphify-out/cache/stat-index.json
     D graphify-out/graph.html
     M graphify-out/graph.json
     M graphify-out/manifest.json
     D mobile-admin/android/.gitignore
     D mobile-admin/android/app/build.gradle
     D mobile-admin/android/app/debug.keystore
     D mobile-admin/android/app/proguard-rules.pro
     D mobile-admin/android/app/src/debug/AndroidManifest.xml
     D mobile-admin/android/app/src/debugOptimized/AndroidManifest.xml
     D mobile-admin/android/app/src/main/AndroidManifest.xml
     D mobile-admin/android/app/src/main/java/com/angelvie/mobileadmin/MainActivity.kt
     D mobile-admin/android/app/src/main/java/com/angelvie/mobileadmin/MainApplication.kt
     D mobile-admin/android/app/src/main/res/drawable/ic_launcher_background.xml
     D mobile-admin/android/app/src/main/res/drawable/rn_edit_text_material.xml
     D mobile-admin/android/app/src/main/res/mipmap-hdpi/ic_launcher.webp
     D mobile-admin/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp
     D mobile-admin/android/app/src/main/res/mipmap-mdpi/ic_launcher.webp
     D mobile-admin/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp
     D mobile-admin/android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp
     D mobile-admin/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp
     D mobile-admin/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
     D mobile-admin/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp
     D mobile-admin/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
     D mobile-admin/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp
     D mobile-admin/android/app/src/main/res/values/colors.xml
     D mobile-admin/android/app/src/main/res/values/strings.xml
     D mobile-admin/android/app/src/main/res/values/styles.xml
     D mobile-admin/android/build.gradle
     D mobile-admin/android/gradle.properties
     D mobile-admin/android/gradle/wrapper/gradle-wrapper.jar
     D mobile-admin/android/gradle/wrapper/gradle-wrapper.properties
     D mobile-admin/android/gradlew
     D mobile-admin/android/gradlew.bat
     D mobile-admin/android/settings.gradle
     M mobile-admin/app.json
     M mobile-admin/app/(tabs)/_layout.tsx
     M mobile-admin/app/(tabs)/analytics.tsx
     M mobile-admin/app/(tabs)/attendance.tsx
     M mobile-admin/app/(tabs)/calendar.tsx
     M mobile-admin/app/(tabs)/dispatch.tsx
     M mobile-admin/app/(tabs)/index.tsx
     M mobile-admin/app/(tabs)/logs.tsx
     M mobile-admin/app/(tabs)/map.tsx
     M mobile-admin/app/(tabs)/personnel.tsx
     M mobile-admin/app/_layout.tsx
     M mobile-admin/app/index.tsx
     M mobile-admin/app/job/[id].tsx
     M mobile-admin/app/login.tsx
     M mobile-admin/babel.config.js
     M mobile-admin/components/Dispatch/LiveActivityCard.tsx
     M mobile-admin/components/Dispatch/PremiumJobCard.tsx
     M mobile-admin/components/Dispatch/TrackingMap.tsx
     M mobile-admin/components/UI/Badge.tsx
     M mobile-admin/components/UI/FleetPulseMap.tsx
     M mobile-admin/constants/Config.ts
     M mobile-admin/constants/Theme.ts
     M mobile-admin/context/AuthContext.tsx
     M mobile-admin/context/RealTimeContext.tsx
     M mobile-admin/context/ThemeContext.tsx
     M mobile-admin/metro.config.js
     M mobile-admin/package-lock.json
     M mobile-admin/package.json
     M mobile-admin/services/api.ts
     M mobile-admin/tsconfig.json
     M mobile-app/app/(tabs)/_layout.tsx
     M mobile-app/app/(tabs)/index.tsx
     M mobile-app/app/(tabs)/overdue.tsx
     M mobile-app/app/(tabs)/tomorrow.tsx
     M mobile-app/app/__tests__/login.test.tsx
     M mobile-app/app/__tests__/today-start-shift.test.tsx
     M mobile-app/app/_layout.tsx
     M mobile-app/app/job/[id].tsx
     M mobile-app/app/login.tsx
     M mobile-app/components/ShiftControlCard.tsx
     M mobile-app/components/ShiftControlDrawer.tsx
     M mobile-app/components/__tests__/ShiftControlCard.test.tsx
     M mobile-app/components/__tests__/ShiftControlDrawer.test.tsx
     M mobile-app/components/jobs/OverdueTaskCard.tsx
     M mobile-app/components/ui/OfflineBanner.tsx
     M mobile-app/constants/Config.ts
     M mobile-app/constants/__tests__/Config.test.ts
     M mobile-app/context/AuthContext.tsx
     M mobile-app/context/LocationContext.tsx
     M mobile-app/context/__tests__/avatar.test.tsx
     M mobile-app/hooks/__tests__/use-push-notifications.test.tsx
     M mobile-app/hooks/data/useDashboard.ts
     M mobile-app/hooks/data/useJobDetails.ts
     M mobile-app/services/SyncManager.ts
     M mobile-app/services/__tests__/apiService.test.ts
     M mobile-app/services/__tests__/locationOutbox.test.ts
     M mobile-app/services/__tests__/locationSyncService.test.ts
     M mobile-app/services/__tests__/sync-queue-logic.test.ts
     M mobile-app/services/apiService.ts
     M mobile-app/services/localDb.ts
     M mobile-app/services/localDb.web.ts
     M mobile-app/services/locationOutbox.ts
     M mobile-app/services/locationSyncService.ts
     M mobile-app/services/syncQueue.ts
     M mobile-app/utils/__tests__/pushNotificationEvents.test.ts
     M mobile-app/utils/pushNotificationEvents.ts
     M mobile-app/utils/queryClient.ts
     M server/api_debug.log
     M server/index.ts
     M server/middleware/idempotency.ts
     M server/routes/__tests__/attendance-daily.test.ts
     M server/routes/__tests__/rider-avatars.test.ts
     M server/routes/__tests__/users-duty.test.ts
     M server/routes/auth.ts
     M server/routes/requests.ts
     M server/routes/riderTasks.ts
     M server/routes/users.ts
     M server/services/__tests__/shiftSessions.test.ts
     M server/services/shiftSessions.ts
     M src/app/pages/Admin/AdminLayout.tsx
     M src/app/pages/Admin/AttendanceDashboard.tsx
     M src/app/pages/Admin/__tests__/attendance-sessions.test.tsx
     M test-results/.last-run.json
     M tests/unit/locationTracking.test.ts
    ?? .agents/
    ?? .codex/
    ?? .superpowers/
    ?? 95cdc515-7d72-4414-85c3-547ec9ee7a67.mp4
    ?? AGENTS.md
    ?? api_debug.log
    ?? app.json
    ?? codex-session-01a0e708-ea05-7503-a964-95c45ee40ead.md
    ?? codex-session-01a0fb55-467b-7091-a907-e89fd5e97bf9-message-feature.md
    ?? codex-session-01a0fff1-9d4a-7630-afc0-f3cfca853a56-latest-1.md
    ?? codex-session-01a10018-f45e-74e2-be28-751cdb05e5db-complete.md
    ?? codex-session-01a10018-f45e-74e2-be28-751cdb05e5db-latest-2.md
    ?? codex-session-01a100f2-43cc-7263-81bf-cef0803d95fcal-final-testing-for-messaging-instant.md
    ?? codex-session-01a106c0-d314-7212-b309-cc390850d183-balancing-data-1.md
    ?? codex-session-01a15d4e-d0cf-7193-bec0-10-21-26-to-continue.md
    ?? "codex-session-01a160ee-b6c5-7742-aaeb-9d2df6341581-10-22-26-continue end-shift time and set admin.md"
    ?? "codex-session-227 error fixing need to continue.md"
    ?? codex-session-avatar.md
    ?? codex-session-login-5-52pm.md
    ?? codex-session-notification-feature.md
    ?? docs/deployment/
    ?? docs/operations/
    ?? docs/superpowers/plans/2026-09-26-expo-sdk-57-expo-go-upgrade.md
    ?? docs/superpowers/plans/2026-09-27-mobile-admin-nativewind.md
    ?? docs/superpowers/plans/2026-09-30-live-delivery-eta-plan.md
    ?? docs/superpowers/plans/2026-09-30-proof-of-delivery.md
    ?? docs/superpowers/plans/2026-09-30-resilient-mobile-tracking.md
    ?? docs/superpowers/plans/2026-10-01-overdue-operations.md
    ?? docs/superpowers/plans/2026-10-02-admin-rider-messaging.md
    ?? docs/superpowers/plans/2026-10-03-messaging-realtime-and-request-loop.md
    ?? docs/superpowers/plans/2026-10-03-mobile-messaging-rate-limit-resilience.md
    ?? docs/superpowers/plans/2026-10-04-web-typecheck-repair.md
    ?? docs/superpowers/plans/2026-10-05-multi-shift-sessions.md
    ?? docs/superpowers/plans/2026-10-05-reliable-shift-handover.md
    ?? docs/superpowers/plans/2026-10-05-security-remediation.md
    ?? docs/superpowers/plans/2026-10-05-shift-flow-edge-case-fixes.md
    ?? docs/superpowers/plans/2026-10-07-delivery-notifications.md
    ?? docs/superpowers/plans/2026-10-07-personnel-admin-web-push.md
    ?? docs/superpowers/plans/2026-10-08-interceptor-rider-eligibility.md
    ?? docs/superpowers/plans/2026-10-08-lean-dispatch-assignment-queue.md
    ?? docs/superpowers/plans/2026-10-08-mobile-app-login-redesign.md
    ?? docs/superpowers/plans/2026-10-08-rider-availability-selection.md
    ?? docs/superpowers/plans/2026-10-09-active-route-selection.md
    ?? docs/superpowers/plans/2026-10-09-rider-avatar-profiles.md
    ?? docs/superpowers/plans/2026-10-22-weekday-auto-absence.md
    ?? docs/superpowers/reports/
    ?? docs/superpowers/specs/2026-09-27-mobile-admin-nativewind-design.md
    ?? docs/superpowers/specs/2026-10-01-overdue-operations-design.md
    ?? docs/superpowers/specs/2026-10-02-admin-rider-messaging-design.md
    ?? docs/superpowers/specs/2026-10-03-messaging-realtime-and-request-loop-design.md
    ?? docs/superpowers/specs/2026-10-03-mobile-messaging-rate-limit-design.md
    ?? docs/superpowers/specs/2026-10-05-multiple-rider-shift-sessions-design.md
    ?? docs/superpowers/specs/2026-10-07-personnel-admin-web-push-design.md
    ?? docs/superpowers/specs/2026-10-08-lean-dispatch-assignment-queue-design.md
    ?? docs/superpowers/specs/2026-10-08-mobile-app-login-redesign.md
    ?? docs/superpowers/specs/2026-10-09-active-route-selection-design.md
    ?? docs/superpowers/specs/2026-10-09-rider-avatar-profiles-design.md
    ?? docs/superpowers/specs/2026-10-22-weekday-auto-absence-design.md
    ?? graphify-out/.graphify_root
    ?? graphify-out/2026-09-30/
    ?? graphify-out/2026-10-01/
    ?? graphify-out/2026-10-02/
    ?? graphify-out/2026-10-03/
    ?? graphify-out/2026-10-04/
    ?? graphify-out/2026-10-05/
    ?? graphify-out/2026-10-06/
    ?? graphify-out/2026-10-07/
    ?? graphify-out/2026-10-08/
    ?? graphify-out/2026-10-09/
    ?? graphify-out/2026-10-10/
    ?? graphify-out/2026-10-13/
    ?? graphify-out/2026-10-14/
    ?? graphify-out/2026-10-15/
    ?? graphify-out/2026-10-21/
    ?? graphify-out/2026-10-22/
    ?? graphify-out/cache/ast/v0.9.12/00384e1edd0cf616a33a4942777f7a6f5a53936db7a863039bd89755a4b478df.json
    ?? graphify-out/cache/ast/v0.9.12/01b2059d3396c94348388dec52e3b3740f455637f268c1d748fe7298e1cd11df.json
    ?? graphify-out/cache/ast/v0.9.12/0415fd61f04580d3cb3ff86e65b0c5b2a1880572903bff09c57f9ad05cf390d0.json
    ?? graphify-out/cache/ast/v0.9.12/05705c68facdf1fbf39c0a0734b32fd609455d3796821ae08f661d767724bf6e.json
    ?? graphify-out/cache/ast/v0.9.12/0585fedaf7baa0e158be60d8f28b8c96a85128f6414e5f154c673edcf26f1e1a.json
    ?? graphify-out/cache/ast/v0.9.12/06d5e167614f91206d84614c665a4a15fff3f42f897b0bd0a15041711c3b5c6b.json
    ?? graphify-out/cache/ast/v0.9.12/0707ef4e9abb08fb3289f8b5f08fc59ffa2b9bffc56e125fa11498800bb2c6a8.json
    ?? graphify-out/cache/ast/v0.9.12/0a6f934d0a0269350744e7561b351695203650dc2c8ad9e45c9512e5c8c10d73.json
    ?? graphify-out/cache/ast/v0.9.12/0aa5263e5fc1240a8acc61f3e42a56ddaf8e8bed520d7df3682f17369672a01e.json
    ?? graphify-out/cache/ast/v0.9.12/103c0c0508fdff73ef0ba3b43cba8d07221477bf30c232d6338fe762aeef169a.json
    ?? graphify-out/cache/ast/v0.9.12/107baa7f126f47f0f408af09e61e0821c95b60631979a1f698a7bf726a94a893.json
    ?? graphify-out/cache/ast/v0.9.12/1185e649b48bb085560b1221c1871c274391935c66513b66d3c424d674e5fa04.json
    ?? graphify-out/cache/ast/v0.9.12/12ac21cd30cf8e1db3c70fec1879ea0fbed8d806276ede3b957e9eeffd4a8a9c.json
    ?? graphify-out/cache/ast/v0.9.12/131e8183219cf83eda544a2dd74cd26086604b4809e70fe2bcd994a11e29babf.json
    ?? graphify-out/cache/ast/v0.9.12/151488e19975f50ec1d23312d1027d425868e15e4b55288415a938e3af5cd9fc.json
    ?? graphify-out/cache/ast/v0.9.12/15a80e9519a80a618406b1b97bbd78c301d66e6948143fce877d9401e4014268.json
    ?? graphify-out/cache/ast/v0.9.12/16712ec1d9f948ebeb3409bfcd45b75515cb89f68372b1827cc6fae91a871a64.json
    ?? graphify-out/cache/ast/v0.9.12/16a621bcb630b74f4d6c83cb4ffe122ed2b275792c65779b2a1ca04989259cfe.json
    ?? graphify-out/cache/ast/v0.9.12/170da12ee205021907b8d3f11e686a8f959aedb63c1d8c7220e89d091c8bc335.json
    ?? graphify-out/cache/ast/v0.9.12/1729e0a3cb83e672f58fac6e2e2985e7e51dd0b60eb08ae1348893fcb58ae441.json
    ?? graphify-out/cache/ast/v0.9.12/1754efb87897eb7cfd4f25a554586b8856f3d746d40a463b8f2fcdc238793068.json
    ?? graphify-out/cache/ast/v0.9.12/175d72333fd932a35309d761758b3c7473023da06e1ecaaf9f48737ed94d0cdf.json
    ?? graphify-out/cache/ast/v0.9.12/18104e6678fde0a621bffc532e97c368b7f18c37a1d68b49a00cc0912e68e48a.json
    ?? graphify-out/cache/ast/v0.9.12/188d02476eee774f229a31328cf3a1fbf609bc06facfee8739b3706f1560034e.json
    ?? graphify-out/cache/ast/v0.9.12/189fe57f73bae17edd8ab655f64d0a308803244c74fe08630012f11dc63624bc.json
    ?? graphify-out/cache/ast/v0.9.12/19ff40912cb3bcfd8d124fa5f5a62114ed72e928f1b5cdd6ac63f4ff677b6e55.json
    ?? graphify-out/cache/ast/v0.9.12/1a6b08df55ccd4fe710d20de81a853108e3e757199aa01b97c7accdb771b9ea9.json
    ?? graphify-out/cache/ast/v0.9.12/1c0054c99e0b9ebf6cbe551a5b431ef9459d448bf6bcaefd95f133ec8680ea16.json
    ?? graphify-out/cache/ast/v0.9.12/1c181b26183da0d5d1aa8bafd0b485dbdf65ad964e7652cd0886633d85e4fda8.json
    ?? graphify-out/cache/ast/v0.9.12/1d7b4ed542f610f00948ffaa96f1c49bbb8fd43776bfa04d898831f89f4a98b9.json
    ?? graphify-out/cache/ast/v0.9.12/1e2226b6dd061e4498f9eb82117cbfaf7cbb902a5a92fd25f1a0a4cdf0db623c.json
    ?? graphify-out/cache/ast/v0.9.12/208224306d029431f9c6b5df04ac5b3141dc6c2750d3f101a6a89e9d790b95a0.json
    ?? graphify-out/cache/ast/v0.9.12/234fbfc5d6984810748cf323edffd12153ced331c038e05236d114b4ca8a7965.json
    ?? graphify-out/cache/ast/v0.9.12/23778c244a576bc5bc3a364a7eb4c668ad0094aef0ee1c7047007c98ac188560.json
    ?? graphify-out/cache/ast/v0.9.12/252df256d6d616af92b434455d05f90fa441e4df7581bac2fbafcc6d5b4190d4.json
    ?? graphify-out/cache/ast/v0.9.12/27ac23c5c2aa74005764fae65c18ff6c871ec87845c1b1d1308c1f703e033016.json
    ?? graphify-out/cache/ast/v0.9.12/280c1a9f9f6ad08f98f1a0b892631923928afe19505f27af78b05605bdb825ac.json
    ?? graphify-out/cache/ast/v0.9.12/28a49cc3a2cbdbe1898cbc023e154fff744f708e2c5ea74e41bb7a45126a93b2.json
    ?? graphify-out/cache/ast/v0.9.12/28df0f1d7e63bc290c829408e261418d3f991d2d5acf871348445584a2124c46.json
    ?? graphify-out/cache/ast/v0.9.12/29abb3036bab6761fecd256932ce23555f9455a1233ed7b4301132c9af70aeb7.json
    ?? graphify-out/cache/ast/v0.9.12/29e15d886728f860d37845fd9e4ebd515fbf9e55fb8c5e18a6981942b0f924ad.json
    ?? graphify-out/cache/ast/v0.9.12/2b365755a78c16ae26ff6c35ffc9421506f9630f5cd69ed198b6f074e0f00810.json
    ?? graphify-out/cache/ast/v0.9.12/2b650dfd183057277ee58270e7cb202e7c80880b71b99a738e66731d368499fe.json
    ?? graphify-out/cache/ast/v0.9.12/2d85048a61905503a80d2a747b616f801afff5e0c83ecd7b17de5e6ec683b1bc.json
    ?? graphify-out/cache/ast/v0.9.12/2ef505850e3f430bb2c91a143949f30d55b2ef3f359386f0e11c3449fe8290c6.json
    ?? graphify-out/cache/ast/v0.9.12/31fcf20d196cc345636d031b52eab81c8402b507bac4a2115579787189f1b2b5.json
    ?? graphify-out/cache/ast/v0.9.12/3221880f765c9a6890218198e7f71a9bf67d9869969c4db86a3eb28357fbb32e.json
    ?? graphify-out/cache/ast/v0.9.12/324155fad5ba9e4f738a69c37d59d23be1a549c0ffd936e9a6947237bb31a930.json
    ?? graphify-out/cache/ast/v0.9.12/32b16a40f5040a2ca4b46373a00a4dfbe413971be20a1d6dd0787ae4cfa70e88.json
    ?? graphify-out/cache/ast/v0.9.12/34718927db5fe461e0e290768e1c64cef7b28ae6100c34f9369df31988e80a73.json
    ?? graphify-out/cache/ast/v0.9.12/34b9a82e99c62c275bddae012141080a0b45de0246b6cf77a558a061414fa33e.json
    ?? graphify-out/cache/ast/v0.9.12/35bc510de69eed8b09ebe4dfe9b5f66411b0abe2d92221945b75dfe15e7a2227.json
    ?? graphify-out/cache/ast/v0.9.12/38288288f8c037eff258d936dfe2340c6b8c5d63246425cf0cb1fb6c642af2e4.json
    ?? graphify-out/cache/ast/v0.9.12/38527740aa9c837080239f7bee02d83e91173e8558dc61090124d3d07cc3da8f.json
    ?? graphify-out/cache/ast/v0.9.12/393427be7e61c71c252060e665d61e58db2f5b62af04d622348693a0c59dbf6c.json
    ?? graphify-out/cache/ast/v0.9.12/3cd7d8d6d66b6b5aa7d4eefd734d0d447ab32d1bda25b6290064b03f2c8d3a1e.json
    ?? graphify-out/cache/ast/v0.9.12/3ee6b6f441a55c9174f02a400eb4ed6b3367a7efec933fdfac3b1caedd44ec8f.json
    ?? graphify-out/cache/ast/v0.9.12/4021967068280b6345e4c4c6e351bd0888d5c19c262f92d6173e935b26cd372d.json
    ?? graphify-out/cache/ast/v0.9.12/41f503de264af0a2b833d2f0e5c4fe1cec4a18b9930561cc25cbb285155ba7cf.json
    ?? graphify-out/cache/ast/v0.9.12/425f11ba617e2addd3b2b69517b92018d7f2404d4d098f767318c8a362008e67.json
    ?? graphify-out/cache/ast/v0.9.12/4290ef80b919a4440bb287530f5dc4cf7527a33901dcc9d3d144054049c3e8b3.json
    ?? graphify-out/cache/ast/v0.9.12/42c6cfa1601df5c9a35e91251ec58a4bbd47c2977c74f50889974fa5c37cb6cb.json
    ?? graphify-out/cache/ast/v0.9.12/472498b1148bfdd1a9945b16b910f18635a4e38a4ae8d964d1b35c7487b7c788.json
    ?? graphify-out/cache/ast/v0.9.12/473bfdd24367481c1c748e255c1d9acbbbb4cd624b22412d46ac606cf8094550.json
    ?? graphify-out/cache/ast/v0.9.12/47c3f93a017b3bbfcfdb364ed024ca3d7f5799874efcfd1c0b850a01a4437491.json
    ?? graphify-out/cache/ast/v0.9.12/484dcf9c475fae212da508e34bd531c2e5fd110c96468200a40be343619a15e5.json
    ?? graphify-out/cache/ast/v0.9.12/48e9d9e50cba1ee4c1bbe3939dbfeb0ff2bd2e177151c0499034abf9efefdd22.json
    ?? graphify-out/cache/ast/v0.9.12/4a0c36bcc3d061a1b06acf49db536cdd846a010b296958bdac8138bc8b29f62f.json
    ?? graphify-out/cache/ast/v0.9.12/4acd7400cd6e2cda1b8f31de738c417cc244feb834d60d5a84ce8ab47a83f928.json
    ?? graphify-out/cache/ast/v0.9.12/4dea2feb8d5ef17f0ead3b3e75a510ce64df8ba60d17322fb2e0e78a3da93b37.json
    ?? graphify-out/cache/ast/v0.9.12/4f6ac2a4c5e6ab992eda49c45361f0a12abab441cd3ad7222ba25f2e7b63b996.json
    ?? graphify-out/cache/ast/v0.9.12/506c04f06e56156a502d40e99081d83ffec141292efb6d8ed515fba6475455fc.json
    ?? graphify-out/cache/ast/v0.9.12/5111de0f0b26439c52a951114b4cc83f50997defa3f2a99b90d9b56f925f1be9.json
    ?? graphify-out/cache/ast/v0.9.12/515da73ad077a7b2ae388e9f24756c1142c3a93fc1815cf0a517e58ede9c4773.json
    ?? graphify-out/cache/ast/v0.9.12/519d6d786bb959924637ffcddc16cf6c4dfdb9d682ce78ecef76f6be0d6cb68f.json
    ?? graphify-out/cache/ast/v0.9.12/52d112132418d63d7a809fe9f670f56d022b7e959775b91db80e260279be448f.json
    ?? graphify-out/cache/ast/v0.9.12/557bf71f8f87d77350b5bfcbb4527245740eb670a6eae1ccaac3b904323bc29d.json
    ?? graphify-out/cache/ast/v0.9.12/56454bb004474e3b6c68ab45b2aa973037bc00488141e79c21a18a861de167df.json
    ?? graphify-out/cache/ast/v0.9.12/578a76a17042b2b94a050f35e739a69b29cf0c973fb40089ff183f5dac772714.json
    ?? graphify-out/cache/ast/v0.9.12/585a81c92d69d82297e1a047d7acec3450bb4cfd1ce66cb2503ff23e38ec861c.json
    ?? graphify-out/cache/ast/v0.9.12/599795b9e9c9998d2bea9d590296212a5a02b6acb6a320c2deb071ac00fb982b.json
    ?? graphify-out/cache/ast/v0.9.12/5b66c169e358d8fffa54b8700fb5190fa0006a1448dd9bfc66bffdef09383136.json
    ?? graphify-out/cache/ast/v0.9.12/5dda11c961ccfb41bd21f3a713e45bd797f547d7301ad0a583027f304714066e.json
    ?? graphify-out/cache/ast/v0.9.12/5f9caa3d404ad11dcfb50411ae94927b7fd2dabdb9d7d7ba8558d5518ad4f547.json
    ?? graphify-out/cache/ast/v0.9.12/6045b9205f09388df04aaed0b53cfd51749a68b3b49e0851d4b5a2ee0c60bfa7.json
    ?? graphify-out/cache/ast/v0.9.12/60e6b80a52dff5b4ee88767d39a4ec135600163d3e1ca341aad560e29b424281.json
    ?? graphify-out/cache/ast/v0.9.12/617327db8ba13678ce991a45da8a5e9a9b35bed300ef10d71ccea80662474150.json
    ?? graphify-out/cache/ast/v0.9.12/625e2e5705519204c01d947cdbeb257cd8817c759d3c0f2b20dcacf99e6df2a5.json
    ?? graphify-out/cache/ast/v0.9.12/631fb37f098f0d65aa18b17c4870c3a980f69e4f97d3a2dd6fc031f6039b7770.json
    ?? graphify-out/cache/ast/v0.9.12/634b6400aa2c1f186f01a9d8d72234d61db1f84703c60cf6922fc9be0b0a44d1.json
    ?? graphify-out/cache/ast/v0.9.12/64e6b5edccf968f4c3a07350443fda601c8f07f682794bdc2f4c912936ac53c8.json
    ?? graphify-out/cache/ast/v0.9.12/661b2777da5e703b435da292e7aea1dbd9497ac47318b1a78e446d09fd95b407.json
    ?? graphify-out/cache/ast/v0.9.12/681eda3e87bbffb4c4b2bd326be371cafbff42c2383afc907b101d816bef310f.json
    ?? graphify-out/cache/ast/v0.9.12/68990fce70e0e6207e046424fd785e779f3428508329878909549012cdc65e26.json
    ?? graphify-out/cache/ast/v0.9.12/68fa6046578acd41a25191f5a847b929cdda63c6927eb6c9713beddb34d319eb.json
    ?? graphify-out/cache/ast/v0.9.12/6b75f2ab55a5008189fe563bc4cd969562e2513e612ddf5a4da3f1f8d83cf2e9.json
    ?? graphify-out/cache/ast/v0.9.12/6bb796e8b1f9888dfa64fce160726b99e8d0efb611c2f61f07658c96eb40cc40.json
    ?? graphify-out/cache/ast/v0.9.12/6c766ba6566944c9220ef3a58ad586fcf8d3d6aeee6c3589f03c108b3c18e157.json
    ?? graphify-out/cache/ast/v0.9.12/6c844710cd429fba90547c8d1d524631388caf3f46794d190f5048262475a1d9.json
    ?? graphify-out/cache/ast/v0.9.12/6ca62c3c4f078ea6643d5011946e985680fb0cd39099716fddddfe066975b789.json
    ?? graphify-out/cache/ast/v0.9.12/6d10031dd59f9b3897df36791c4a410283b7252f97f4dd9fdbdb5515ccedf956.json
    ?? graphify-out/cache/ast/v0.9.12/6d3ef7dffaf32fa73ec67f008c9433367be8609b208ac5ca7ac51e8e46ae1b71.json
    ?? graphify-out/cache/ast/v0.9.12/6d8d2b927ebc180d5178ebdcf2f4fd877edb68338612ae3b826a1502838c86ad.json
    ?? graphify-out/cache/ast/v0.9.12/6da5e1e2796bc0a5c5fbae96ef1eacb44f04e9a5276cf7dc2d9105e2a6fb0448.json
    ?? graphify-out/cache/ast/v0.9.12/6f3fabfeea9a4df4e4ac05b5b2f654633bbb7802086b57ea26eb7c9acc148806.json
    ?? graphify-out/cache/ast/v0.9.12/70d959344fd640bc0a9f114871dfe141c8d377c140d6542d98f2f91fa31e1412.json
    ?? graphify-out/cache/ast/v0.9.12/70e911bb95a7c5878796c9c93c414d141fcd6a71ff1cef75dd94063e856dd0b6.json
    ?? graphify-out/cache/ast/v0.9.12/71cb12af7cad24018754d025169665a1a60c0793bfd97490c2624b77d1f59ccf.json
    ?? graphify-out/cache/ast/v0.9.12/71fecace7ac2d03dc21e9fc8e8a942d908f0b071bbc5a9e6055b25b26b3ffd04.json
    ?? graphify-out/cache/ast/v0.9.12/732f252397ee1e5bd843b3d3183e7fb51877eafb2d9782241d6adc3c937aeb14.json
    ?? graphify-out/cache/ast/v0.9.12/73accb58f69b18360a71dd007186a2274ff5bad493027196146c179db6cbbb64.json
    ?? graphify-out/cache/ast/v0.9.12/73df5cecc4ba3bfdd400bd4ae5a588fa9341f7b9ee01ab98cdf75023488f0458.json
    ?? graphify-out/cache/ast/v0.9.12/7636f6a89749670b6842abdff0d213b0ddf844992397497f4b753306b3926bd3.json
    ?? graphify-out/cache/ast/v0.9.12/77a6abb647b44d69a2e7bd78dee84f2f303e3c9bdb3665c942cc545eae2e8479.json
    ?? graphify-out/cache/ast/v0.9.12/77d7cac4152efece04457a6580e8bfa710ab855fc4339392538d881721eed281.json
    ?? graphify-out/cache/ast/v0.9.12/7b5a90d26e2741c47358573ac97c2938e22ec7e54630a14678afb8d22a5469d8.json
    ?? graphify-out/cache/ast/v0.9.12/7b703404e5c257db54dd6f84a1fc046e0bfe97d916fe10c1df09af831033a7de.json
    ?? graphify-out/cache/ast/v0.9.12/7c2088a5d643236462a83734b7496b20388fe819c3f7626e6b3d32d8179b4022.json
    ?? graphify-out/cache/ast/v0.9.12/7e12a1631300ed8f429b71e2bf749df82f8b3ebfef4a9537ef4347d83b8b2ba2.json
    ?? graphify-out/cache/ast/v0.9.12/7e33f2138f6a85ace7d9bb45670dbd402b8b3a0d20c58d4cb2d4d1b810a55658.json
    ?? graphify-out/cache/ast/v0.9.12/7e4191d139470cfcf57ecc2f277122f69ed935d42eb3064c7cc0e292c2ea6ab1.json
    ?? graphify-out/cache/ast/v0.9.12/7e51b85d174f21ffa4f630ac493cbdaefdbfe5c9d74dcda9fc1ed894c8a820c2.json
    ?? graphify-out/cache/ast/v0.9.12/7f2bbac454a953128f7b688b8ad358594a56d26e32c05e1cb9da4f59b089992e.json
    ?? graphify-out/cache/ast/v0.9.12/7fd741bb64019981de2cab9485833f2e71259c19c222f7bcfcf6dcde15a15dc6.json
    ?? graphify-out/cache/ast/v0.9.12/818d89348e0c7344be25c4467e78683759360632f71af4435ebc44929cac2b02.json
    ?? graphify-out/cache/ast/v0.9.12/82117f37ee6d1bc5e691838dd3ab2bd25d007456440d647b4321579dd604d9c1.json
    ?? graphify-out/cache/ast/v0.9.12/8404485dc5af5ccdae0a5dcf4b70663bd71c512b260d0c57c477008990f2a2a2.json
    ?? graphify-out/cache/ast/v0.9.12/8407c3d05b14df2e0d3d88323b6735ccd3305f95178b64339a90a3ba0152914f.json
    ?? graphify-out/cache/ast/v0.9.12/8629aa1404b53123f1429020b84f8c7c5196ae447b773ffd00ce985ec22d919a.json
    ?? graphify-out/cache/ast/v0.9.12/87ac78c3d62221fb59461c92f2588b2007394746240db4752b1d2498f0fcbe01.json
    ?? graphify-out/cache/ast/v0.9.12/88ba806d3f9dc9331dc76844c6b28a3690ceb3e0d938d5566e5ae1ad27c39f74.json
    ?? graphify-out/cache/ast/v0.9.12/89ff3995e7c876d3dbd6fded0e420a887d82541f6a4b4c908c3bbd959ffbf7aa.json
    ?? graphify-out/cache/ast/v0.9.12/8b39da82636743e25ee43ae2e9d9dda2f7b596302cfb6966d7a240455e369c1b.json
    ?? graphify-out/cache/ast/v0.9.12/8ba2512fd92f268a84d800f4fc48258fa098dabd1221a67f517d50d91e10b63a.json
    ?? graphify-out/cache/ast/v0.9.12/8be47cfc36a17c50d64a762e823ef9b0d3e9d159d7a9fd7e4f4214992ca2e7f4.json
    ?? graphify-out/cache/ast/v0.9.12/8c2aeff7c8481260216e9271ef56517d444113f4a976c957aaa44c79f51df38f.json
    ?? graphify-out/cache/ast/v0.9.12/8e159ef1e34ab0b3be236840d2d05ea4de057900ee1f6713c6aac8be57b1d79c.json
    ?? graphify-out/cache/ast/v0.9.12/9243b0ee16f37c0915c6ce1d106d25480a906f1eada9700e69a3b86baa92ef14.json
    ?? graphify-out/cache/ast/v0.9.12/93f261d4fff0bf8a19345fa1697312021bf04627008fb60566064dd22ad889da.json
    ?? graphify-out/cache/ast/v0.9.12/93f3781fbc3219a04cfe1ccb2bf7b3328084dc2d294f263094df8a2ffa05e8cb.json
    ?? graphify-out/cache/ast/v0.9.12/94890673e4352fa926524cae87b68e0587861d091e05ef6b3c882b3fc6b4ffaa.json
    ?? graphify-out/cache/ast/v0.9.12/95ad4ce1df2b01f3b451ed70e93a54e363861eadb8baf6fd29098d1cca690187.json
    ?? graphify-out/cache/ast/v0.9.12/966ad0ab9a022866d904b6ff9bdaaae2585ab30d8c1f4d0937ef9c3eba10cbeb.json
    ?? graphify-out/cache/ast/v0.9.12/97634e831f8eff2e80dc124778fcb468933f1980d28a99daca7e8be6f33be125.json
    ?? graphify-out/cache/ast/v0.9.12/9805606eb8fcf5512fda0b7f6f7c7b94d11beb5be92f4bb6ba4861fc9207110b.json
    ?? graphify-out/cache/ast/v0.9.12/98e3266912e3a80f0d182c936eee1920ba1fa1f8d52cb7bd757fd2a065b97f5c.json
    ?? graphify-out/cache/ast/v0.9.12/9a7dda5e87674c6395b0ec88ece15ca7f002fbc125472f68752bc5435487da2f.json
    ?? graphify-out/cache/ast/v0.9.12/9b56794bbc884058d07a8b3637e013795497d144ee5510e94215942e4f4b829d.json
    ?? graphify-out/cache/ast/v0.9.12/9b8c25362f1bb9eaa8c05124fbb5ca6be4726fe246c81a10d3de82a00d15b0df.json
    ?? graphify-out/cache/ast/v0.9.12/9c348250385bb5f9a4a91911a58ff4e21160408afe22de87018a07a19730ab80.json
    ?? graphify-out/cache/ast/v0.9.12/9db15ca412500080b73bb638f34a5bf1337f2de57545530e989db8c94e316a23.json
    ?? graphify-out/cache/ast/v0.9.12/9e99572b17258e86d5ab15aff214fa71fad63f1a3895a75af9e34b1ca75909eb.json
    ?? graphify-out/cache/ast/v0.9.12/9fa98ad89b5457fcb0528ea1e56bd6929a97f2ec17d5321f623f44489e3525b3.json
    ?? graphify-out/cache/ast/v0.9.12/a00f17bf9105081fd60417dd65541d25e24ef771386f7a97ef8c4570dbb18a02.json
    ?? graphify-out/cache/ast/v0.9.12/a0e308a109f95a09a1957606a018c7a1a4c9e700e1606eb703b18adef9fda8f3.json
    ?? graphify-out/cache/ast/v0.9.12/a24a8456f9078b59031c81fbc7c03a1d84a35f3165cb26bb4d1b6b729bd3ea2b.json
    ?? graphify-out/cache/ast/v0.9.12/a4b64c15f1e08ae04488ab1a5295c976447abdc3ee008498784ebccd6f081c9a.json
    ?? graphify-out/cache/ast/v0.9.12/a542dc94b74467bc6d0e52f6211025ce000f12643ec0124c50123c25b3b42294.json
    ?? graphify-out/cache/ast/v0.9.12/a558a83e9da9f2198c99c0d441160203e767887cf0df40ffce4fed3a3920d4df.json
    ?? graphify-out/cache/ast/v0.9.12/a59d5aabe5a09aa732de43d86b67d6742cdbea0565be6eae0a8e8d7cee674d13.json
    ?? graphify-out/cache/ast/v0.9.12/a7bcff31907e2c97a986df8ada4dfacc2b5833caab1122df61d13ce1c3b0ed53.json
    ?? graphify-out/cache/ast/v0.9.12/a98decfd20e4e5924d01189cfe00a8526822a7f7e1135e9a4e0d0ff3d9b878b5.json
    ?? graphify-out/cache/ast/v0.9.12/a99d79561cf2845529f1c538d107e366df4192b9c07992e51967c8f4e2f45030.json
    ?? graphify-out/cache/ast/v0.9.12/a9b65f8b6965a144fd298574b33eb4253c5abb70e21a56b19ea9fd2cf1216fe8.json
    ?? graphify-out/cache/ast/v0.9.12/aa16bc7fef33289c8a2431194332290cbd562d5df1bd1c8026d75f12c62764c5.json
    ?? graphify-out/cache/ast/v0.9.12/ac9399bbd203abf61ccb2917b0710e5f8c87de07a10573090fd761e3880d2bc8.json
    ?? graphify-out/cache/ast/v0.9.12/ad28d133443a041205b57de59917bc7ca50cd89d41356dda78545dbc8ef2e057.json
    ?? graphify-out/cache/ast/v0.9.12/b299c227b606b96c78da30cd774538c2803579258265f340f1b3a09f554495e3.json
    ?? graphify-out/cache/ast/v0.9.12/b2d9cf86cceaa2fc755c3dcc26f434497cd913453150ad1c5e9db381af7db7ba.json
    ?? graphify-out/cache/ast/v0.9.12/b6611e8615929a5ee5541b6ee37bcc944fe874f034752eb62c424d4b0e8bf7a5.json
    ?? graphify-out/cache/ast/v0.9.12/b667a96d31b67385c8132b970245f0479ad9c71884eb265a9e6c87775d68f1fe.json
    ?? graphify-out/cache/ast/v0.9.12/b7349c980ccd2d8ebd72e069f5dea1a364da91653f1b41072627e3ff13aaaf63.json
    ?? graphify-out/cache/ast/v0.9.12/b74dcd43880c2ab01fbbb4a18879f855d2120f0d775d09a9fbee5d6ed6364a30.json
    ?? graphify-out/cache/ast/v0.9.12/bae152b96ac6d6c1ee84e301dcd6586bedbebf47ce8b010aaebb7d1738811da9.json
    ?? graphify-out/cache/ast/v0.9.12/bb0e7b843773e4c62de14ebd1b886a96654b697c20ae095dbb56e01576d0bb87.json
    ?? graphify-out/cache/ast/v0.9.12/bb6ad8d1992b5c4b32dbb7e8bb744192a9b7ec2f899446e7b5d5bfb0567c74d7.json
    ?? graphify-out/cache/ast/v0.9.12/bd0263e30287fa66ff96658182f10ee3579b98e4e36e1639f912c7eb8f2be717.json
    ?? graphify-out/cache/ast/v0.9.12/be0c77ba9ad044fe872ec3a180c90afde4e73dfd578dd57804e58cdee6734a19.json
    ?? graphify-out/cache/ast/v0.9.12/c044733c929ef69dcd2937bf831073c68cf12fdb7c29ceabc58ee0617bd3ca13.json
    ?? graphify-out/cache/ast/v0.9.12/c0814861d185ce89d7904724069d48b1883cd688fda64a18df1ef15b0c5abeb0.json
    ?? graphify-out/cache/ast/v0.9.12/c100d2da47799a56d760c566659751529131f363f201c8cb4a8bd43da981fbbf.json
    ?? graphify-out/cache/ast/v0.9.12/c1574357a34568ea20b1bd8e616ab3d369aefa16ec5a1af7d6eb3222ee9ad573.json
    ?? graphify-out/cache/ast/v0.9.12/c264f9d489d88415a33bffcefc2a1c162640575c8b98467ffc53d65fc46b3d94.json
    ?? graphify-out/cache/ast/v0.9.12/c38032809fd5bdbe9022ee330a70789799d4812fbfba668ca00e02be7fd69f40.json
    ?? graphify-out/cache/ast/v0.9.12/c501ecb6c6e7495ea5427da4fbebb9ef93e53b7690db6341c3fa1afecd722cba.json
    ?? graphify-out/cache/ast/v0.9.12/c5f5c5adbfb0c4cc1c7566c972338a558c704b70bf8fc8e6bff49ddaec431513.json
    ?? graphify-out/cache/ast/v0.9.12/c853ee2d95e156f00f4ac0b98653039f6cede1977544703b0e75093dd87ab374.json
    ?? graphify-out/cache/ast/v0.9.12/c893a8549212f852aea624c1b3570cf148783a015304793f065d674eaaf170d3.json
    ?? graphify-out/cache/ast/v0.9.12/c8a0ada27f36e3470f90988fd33457e924d4f44d6cb5d7b78ae308097f8fa102.json
    ?? graphify-out/cache/ast/v0.9.12/c8dfd59ccc9d3175b367102f17a9246f7bf84a3f4fe5faf44963f1edb68fa93b.json
    ?? graphify-out/cache/ast/v0.9.12/c9505520a19c9770a3ccdd88c4c5c6c37889f2a67ed0ad95bfe67500db296dd1.json
    ?? graphify-out/cache/ast/v0.9.12/c9859f3a7c004d9eddcd04419ef627d542dd47f7e335158a46d8662a98568fa7.json
    ?? graphify-out/cache/ast/v0.9.12/c99f68be5e62a6ba1930e848f846ea5a80999d5c81d78d2f7b5d57c23f98de2a.json
    ?? graphify-out/cache/ast/v0.9.12/cc82263b1370d534cfb9b5c50da749ac382c2918ab8dde614b394143fa2219d5.json
    ?? graphify-out/cache/ast/v0.9.12/cd9c598a4de3508a80361a08db5a2990d8f82feae96d31c3c674e25f27cfe84b.json
    ?? graphify-out/cache/ast/v0.9.12/d07e218c477efefbd94ffc4ebe38d575f9078c5116e6c032efe5cd60e8ad4f7c.json
    ?? graphify-out/cache/ast/v0.9.12/d08cb3fbafa2d1a0ab4a607495a129a9d8d66f9eae4a2e66f84233148c8f909e.json
    ?? graphify-out/cache/ast/v0.9.12/d129f9f062b02ff957d83f469763d27c59a40ed220dff82bbfda5a0e7b574f4b.json
    ?? graphify-out/cache/ast/v0.9.12/d1b381b5330789630b660134f5380af1f59a1b0e421af2a92e910cf6d27462a1.json
    ?? graphify-out/cache/ast/v0.9.12/d2864bfc5a9f9861ce1f9638f7fe75273476794150428788c38b6bfec34fd205.json
    ?? graphify-out/cache/ast/v0.9.12/d2ed6c4a575193e6fc7d8117ee6c22f8b769cf7e8fe6f0e585c2cd78959c575a.json
    ?? graphify-out/cache/ast/v0.9.12/d3c5b7922cb627889f74d8a4f14e730134e5336e6267b065b840b364b3925948.json
    ?? graphify-out/cache/ast/v0.9.12/d413a7048dabc0bf41d933db90c9504e89c48408c2f04b97dce89bca3fd77392.json
    ?? graphify-out/cache/ast/v0.9.12/d739a520dff22414c4294b30907fe7c2d1722fa6b5d92f3b5b24ab1ffbc905c3.json
    ?? graphify-out/cache/ast/v0.9.12/d97f3394a0bdd82cda8fb421fd27d25d6a0d051ba172e3b75d7317199e31edcb.json
    ?? graphify-out/cache/ast/v0.9.12/d9b2cebfb86489be3f26e6186916331cccd935b0f591569d7a780674dd7bbe28.json
    ?? graphify-out/cache/ast/v0.9.12/db605cedc77f574062448c51d11f250900eb1bc62fd54a518c49fd75dba8c4b9.json
    ?? graphify-out/cache/ast/v0.9.12/db7b2e009ac6da26341f277906f1c8cd46f29b978285dfc2b02e6e49f9567ad0.json
    ?? graphify-out/cache/ast/v0.9.12/e061f4696fb77221f50c352a489f19d210e6fd13df1a53bb4472fd75e70bc396.json
    ?? graphify-out/cache/ast/v0.9.12/e08f391a5cb30956977d99bd3a7a18534381ba921b2d56e2ff8c1aaf019d0f38.json
    ?? graphify-out/cache/ast/v0.9.12/e1a71a26045738227cfbf80fc9c4d5d1c7cdc9425313ca94113de51195d66b3d.json
    ?? graphify-out/cache/ast/v0.9.12/e1e85ef02ade226915bf015998b54aeccd63a6b436157f753b5f69f89ebaf6cd.json
    ?? graphify-out/cache/ast/v0.9.12/e54096c6ceb106db54b21aa106f025c9770dc4dcf4d7d49c05d0be34bf6267c6.json
    ?? graphify-out/cache/ast/v0.9.12/e806cc36689ee947c7ea4f84fb5b24a8869dadfa563c37727746755e6082d651.json
    ?? graphify-out/cache/ast/v0.9.12/ebd9fb7dc1f57e14ba9cebfb97ce49d177260870b5940e5ad1d5a82939acaf5b.json
    ?? graphify-out/cache/ast/v0.9.12/ec7518a20c9216d4b30eea05ccda4da2fad6a24873421796704ebf3ba1634a20.json
    ?? graphify-out/cache/ast/v0.9.12/ed2e5b66b073a509b02cf3abe5028a2c38d5b780c882a09bf8776469fd5d716e.json
    ?? graphify-out/cache/ast/v0.9.12/edd62bdf8b75de3ea34f945fc5566030545809460d31ce87ab05cc1f4c4696d6.json
    ?? graphify-out/cache/ast/v0.9.12/eea881bcadab43dab72e18bf75445bb13a6cd9c49715d2afd310ace7043fc928.json
    ?? graphify-out/cache/ast/v0.9.12/efeddc4a0f09a43f30379dd0478476d4b05b59875c60db6ddb5b8c9e00b8d49f.json
    ?? graphify-out/cache/ast/v0.9.12/f08827a7e0fd260715446e93a3d443aa8927deb975285dfc362ca3e9cbdb1bf8.json
    ?? graphify-out/cache/ast/v0.9.12/f13f9041ceb7248c534333edfdb38e9401ddd356916ed037ec4b92b0241a15c6.json
    ?? graphify-out/cache/ast/v0.9.12/f1712e1a7aa25d5cf25448d809efdb5cbcd01a6466843d39ba4e48787189d21a.json
    ?? graphify-out/cache/ast/v0.9.12/f423ad999b46931e498eb44d18a453990981db4ab47323a2f3a6f1ee9588b7a7.json
    ?? graphify-out/cache/ast/v0.9.12/f430dc3576552130599a96f1bbda6a64c1bfff3ebf53da87431a19336399809a.json
    ?? graphify-out/cache/ast/v0.9.12/f5bc45729928c7f41288cc7de654552cdc2cd9cc3692fd11bb3c34dbb0ac8f24.json
    ?? graphify-out/cache/ast/v0.9.12/f65a53226a8c87ca6ecc9ccd034e349953f33aa92cf758abdd13a083e0efa8b3.json
    ?? graphify-out/cache/ast/v0.9.12/f7d3d5d4a47b2a89e85fa7b1b0b778e51623590ebdb8e19a73ba7491af6dcfa7.json
    ?? graphify-out/cache/ast/v0.9.12/f80be355eec8bf569a2b745a95af4c2e28e1e273c735e96cbabac61635e41b4c.json
    ?? graphify-out/cache/ast/v0.9.12/f943d06c8ccea08af56cebd8ee8e1e57d6e62dbb368905c9c08d69acd88fbe35.json
    ?? graphify-out/cache/ast/v0.9.12/f96b8739d8f2224614e307f4198ba3c11891e8df16e1432f8ceb660121d21653.json
    ?? graphify-out/cache/ast/v0.9.12/fa24806676778d2e124d45151935835aae9feeb15a17f0850446b70a63eec781.json
    ?? graphify-out/cache/ast/v0.9.12/fb90c5c18b8da06ac80947ce3607eb1578a75dec20c8ad06c2f668f079008545.json
    ?? graphify-out/cache/ast/v0.9.12/fbbe634895ed395dd65531645500aaa14338dec286f3b59129ef8f08f62da9b8.json
    ?? graphify-out/cache/ast/v0.9.12/fdcfccb1c24b27c0ba9167c14fcb303e63a3a957db2f67d9593b201cf3f4ac1c.json
    ?? graphify-out/cache/ast/v0.9.12/fe81f3636d7e4eeba6a73e0d83d8c41b3b3fd0e43dfd896bd88974a93cc6d765.json
    ?? mobile-admin/app/(tabs)/profile.tsx
    ?? mobile-admin/components/Dispatch/DispatchModal.tsx
    ?? mobile-admin/components/Dispatch/FilterModal.tsx
    ?? mobile-admin/components/Dispatch/SequenceModal.tsx
    ?? mobile-admin/eas.json
    ?? mobile-admin/global.css
    ?? mobile-admin/hooks/
    ?? mobile-admin/nativewind-env.d.ts
    ?? mobile-admin/package-lock.pre-sdk57.json
    ?? mobile-admin/services/tokenStorage.ts
    ?? mobile-admin/store/
    ?? mobile-admin/tailwind.config.js
    ?? mobile-admin/utils/date.ts
    ?? mobile-admin/utils/deliveryStatus.ts
    ?? mobile-admin/utils/useDebounce.ts
    ?? mobile-app-review-lint.log
    ?? mobile-app-review-tests.log
    ?? mobile-app-review-typecheck.log
    ?? mobile-app/app/__tests__/overdue-shift-visibility.test.tsx
    ?? mobile-app/components/jobs/ShiftTaskAccessNotice.tsx
    ?? mobile-app/components/ui/__tests__/offlineBanner.test.tsx
    ?? mobile-app/context/ConnectionContext.tsx
    ?? mobile-app/context/__tests__/ConnectionContext.test.tsx
    ?? mobile-app/export-validation.log
    ?? mobile-app/services/__tests__/connectionState.test.ts
    ?? mobile-app/services/__tests__/localDb.test.ts
    ?? mobile-app/services/__tests__/localDb.web.test.ts
    ?? mobile-app/services/connectionState.ts
    ?? mobile-app/utils/__tests__/riderStatusSync.test.ts
    ?? mobile-app/utils/__tests__/shiftHours.test.ts
    ?? mobile-app/utils/riderStatusSync.ts
    ?? mobile-app/utils/shiftHours.ts
    ?? server/middleware/riderShiftAccess.ts
    ?? server/routes/__tests__/riderStatusOperations.test.ts
    ?? server/routes/shiftSchedule.ts
    ?? server/scripts/2026-10-21-rider-status-operations.sql
    ?? server/scripts/2026-10-22-weekday-auto-absence.sql
    ?? server/services/__tests__/shiftCutoff.test.ts
    ?? server/services/__tests__/shiftSchedule.test.ts
    ?? server/services/riderStatusOperations.ts
    ?? server/services/shiftCutoff.ts
    ?? server/services/shiftSchedule.ts
    ?? src/app/pages/Admin/ShiftHours.tsx
    ?? src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx
    ?? src/app/pages/Admin/__tests__/attendance-duty.test.tsx
    ?? tests/messaging-e2e.spec.ts
    ?? tests/unit/admin-lint-attendance.test.tsx
    ?? tests/unit/admin-messaging-events.test.ts
    ?? tests/unit/admin-messaging.test.ts
    ?? tests/unit/admin-modal-state.test.tsx
    ?? tests/unit/admin-notification-bell.test.tsx
    ?? tests/unit/admin-rider-message-preview.test.tsx
    ?? tests/unit/client-id.test.ts
    ?? tests/unit/mobile-admin-philippine-date.test.ts
    ?? tests/unit/overdue.test.ts
    ?? tests/unit/personnel-lint-draft.test.tsx
    ?? tests/unit/personnel-v2-revision.test.ts
    ?? tests/unit/priority-fixes.test.ts
    ?? tests/unit/request-card-metadata.test.tsx
    ?? tests/unit/rider-avatar-catalog.test.ts
    ?? tests/unit/rider-fcm-migration.test.ts
    ?? tests/unit/roleRoutes.test.ts
    ?? tests/unit/tracking-lint.test.tsx
    ?? tests/unit/web-push-service-worker.test.ts
    ?? tests/unit/weekly-schedule.test.ts
    ?? vitest.config.ts
    server\services\auditLogger.ts
    server\scripts\verify-weekly-schedule.ts
    server\scripts\test-rider-idempotency.cjs
    server\scripts\test-physics-logic.cjs
    server\scripts\test-analytics-logic.cjs
    server\scripts\simulate-rider-movement.cjs
    server\scripts\simulate-rider-movement-local.cjs
    server\scripts\setup-test-session.cjs
    server\scripts\cleanup-idempotency.cjs
    server\scripts\check-accounting.ts
    server\scripts\archive-data.cjs
    server\scripts\2026-10-22-weekday-auto-absence.sql
    server\scripts\2026-10-21-rider-status-operations.sql
    server\schemas\requestSchema.ts
    server\schemas\conversationSchema.ts
    server\schemas\authSchema.ts
    server\routes\authSession.ts
    server\routes\auth.ts
    server\routes\analytics.ts
    server\routes\conversations.ts
    server\routes\notifications.ts
    server\routes\routing.test.ts
    server\routes\riderTasks.ts
    server\routes\requests.ts
    server\routes\shiftSchedule.ts
    server\routes\routing.ts
    server\routes\users.ts
    server\routes\__tests__\web-push-subscriptions.test.ts
    server\routes\__tests__\users-duty.test.ts
    server\routes\__tests__\riderStatusOperations.test.ts
    server\routes\__tests__\rider-avatars.test.ts
    server\routes\__tests__\request-attribution.test.ts
    server\routes\__tests__\request-assignment-queue.test.ts
    server\routes\__tests__\notifications-security.test.ts
    server\routes\__tests__\messagingRealtime.integration.test.ts
    server\routes\__tests__\conversations.test.ts
    server\routes\__tests__\auth-session.test.ts
    server\routes\__tests__\auth-security.test.ts
    server\routes\__tests__\auth-refresh.test.ts
    server\routes\__tests__\attendance-daily.test.ts
    server\routes\__tests__\analytics-accounting-auth.test.ts
    src/app/components/Admin\__tests__\interceptor-rider-availability.test.tsx
    src/app/components/Admin\RequestReconciliation.tsx
    src/app/components/Admin\OperationalIntegrityView.tsx
    src/app/components/Admin\NotificationBell.tsx
    src/app/components/Admin\notification-bell.css
    src/app/components/Admin\FloatingRiderMessagePreview.tsx
    src/app/components/Admin\EnhancedBatchApproveModal.tsx
    src/app/pages/Admin\__tests__\weekly-loading.test.tsx
    src/app/pages/Admin\__tests__\rider-map-transparency.test.tsx
    src/app/pages/Admin\__tests__\main-accounting.test.tsx
    src/app/pages/Admin\__tests__\dispatch-status-tabs.test.tsx
    src/app/pages/Admin\__tests__\dispatch-queue-order.test.tsx
    src/app/pages/Admin\__tests__\attendance-sessions.test.tsx
    src/app/pages/Admin\__tests__\attendance-handover.test.tsx
    src/app/pages/Admin\__tests__\attendance-duty.test.tsx
    src/app/pages/Admin\__tests__\attendance-date-rollover.test.tsx
    src/app/pages/Admin\__tests__\attendance-auto-absence.test.tsx
    src/app/pages/Admin\__tests__\analytics-math.test.ts
    src/app/pages/Admin\__tests__\analytics-logic.test.ts
    src/app/pages/Admin\__tests__\admin-sidebar-order.test.tsx
    src/app/pages/Admin\UserManagement.tsx
    src/app/pages/Admin\ThemeSelection.tsx
    src/app/pages/Admin\ShiftHours.tsx
    src/app/pages/Admin\RiderMap.tsx
    src/app/pages/Admin\DispatchStatusTabs.tsx
    src/app/pages/Admin\DispatchConsole.tsx
    src/app/pages/Admin\CalendarView.tsx
    src/app/pages/Admin\AttendanceDashboard.tsx
    src/app/pages/Admin\AnalyticsHub.tsx
    src/app/pages/Admin\AdminPendingTab.tsx
    src/app/pages/Admin\AdminMessaging.tsx
    src/app/pages/Admin\AdminLayout.tsx
    src/app/pages/Admin\admin-performance.css
    src/app/components/Admin\Dispatch\RequestCard.tsx
    src/app/components/Admin\Dispatch\DispatchMapView.tsx
    src/app/components/Admin\DevSimulator.tsx
    src/app/components/Admin\DeviationApprovalModal.tsx
    src/app/components/Admin\ConflictResolutionModal.tsx
    src/app/components/Admin\Dispatch\RequestList.tsx
    src/app/components/Admin\Dispatch\RequestDetailsPanel.tsx
    src/app/components/Admin\Dispatch\RiderSelectionList.tsx
    src/app/components/Admin\Dispatch\TimelineComponent.tsx
    src/app/components/Admin\Dispatch\__tests__\rider-selection-availability.test.tsx
    src/app/components/Admin\Dispatch\__tests__\request-ledger-visibility.test.tsx
    src/app/components/Admin\Dispatch\__tests__\request-details-availability.test.tsx
    src/app/components/Admin\Dispatch\__tests__\request-card-selection.test.tsx
    src/app/components/Admin\Dispatch\__tests__\read-only-details.test.tsx
    src/app/components/Admin\Dispatch\__tests__\assignment-flow.test.tsx
    src/app/components/Admin\Dispatch\__tests__\active-route-selection-ui.test.tsx
    {
      "name": "@figma/my-make-file",
      "private": true,
      "version": "0.0.1",
      "type": "module",
      "scripts": {
        "dev:frontend": "vite",
        "dev:backend": "cd server && node ../node_modules/tsx/dist/cli.mjs watch index.ts",
        "stop:backend": "powershell -ExecutionPolicy Bypass -File scripts/stop-dev-port.ps1 -Port 3001",
        "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
        "build:frontend": "vite build",
        "build:backend": "cd server && npm install && npm run build",
        "build": "npm run build:frontend && npm run build:backend",
        "start": "cd server && npm start"
      },
      "dependencies": {
        "@bugsnag/browser-performance": "^3.4.1",
        "@bugsnag/js": "^8.9.0",
        "@bugsnag/plugin-react": "^8.9.0",
        "@radix-ui/react-accordion": "1.2.3",
        "@radix-ui/react-alert-dialog": "1.1.6",
        "@radix-ui/react-aspect-ratio": "1.1.2",
        "@radix-ui/react-avatar": "1.1.3",
        "@radix-ui/react-checkbox": "1.1.4",
        "@radix-ui/react-collapsible": "1.1.3",
        "@radix-ui/react-context-menu": "2.2.6",
        "@radix-ui/react-dialog": "1.1.6",
        "@radix-ui/react-dropdown-menu": "2.1.6",
        "@radix-ui/react-hover-card": "1.1.6",
        "@radix-ui/react-label": "2.1.2",
        "@radix-ui/react-menubar": "1.1.6",
        "@radix-ui/react-navigation-menu": "1.2.5",
        "@radix-ui/react-popover": "1.1.6",
        "@radix-ui/react-progress": "1.1.2",
        "@radix-ui/react-radio-group": "1.2.3",
        "@radix-ui/react-scroll-area": "1.2.3",
        "@radix-ui/react-select": "2.1.6",
        "@radix-ui/react-separator": "1.1.2",
        "@radix-ui/react-slider": "1.2.3",
        "@radix-ui/react-slot": "1.1.2",
        "@radix-ui/react-switch": "1.1.3",
        "@radix-ui/react-tabs": "1.1.3",
        "@radix-ui/react-toggle": "1.1.2",
        "@radix-ui/react-toggle-group": "1.1.2",
        "@radix-ui/react-tooltip": "1.1.8",
        "@react-leaflet/core": "^2.1.0",
        "argon2": "^0.44.0",
        "class-variance-authority": "0.7.1",
        "clsx": "2.1.1",
        "cmdk": "1.1.1",
        "date-fns": "3.6.0",
        "embla-carousel-react": "8.6.0",
        "framer-motion": "^12.38.0",
        "input-otp": "1.4.2",
        "leaflet": "^1.9.4",
        "leaflet.markercluster": "^1.5.3",
        "lucide-react": "0.487.0",
        "mysql2": "^3.20.0",
        "next-themes": "0.4.6",
        "react": "18.3.1",
        "react-day-picker": "8.10.1",
        "react-dom": "18.3.1",
        "react-hook-form": "7.55.0",
        "react-leaflet": "^4.2.1",
        "react-leaflet-cluster": "^2.1.0",
        "react-resizable-panels": "2.1.7",
        "react-router": "7.13.0",
        "recharts": "2.15.2",
        "sonner": "2.0.3",
        "tailwind-merge": "3.2.0",
        "tw-animate-css": "1.3.8",
        "vaul": "1.1.2",
        "xlsx": "^0.18.5"
      },
      "devDependencies": {
        "@dicebear/core": "10.7.0",
        "@dicebear/styles": "10.6.0",
        "@playwright/test": "^1.58.2",
        "@tailwindcss/vite": "4.1.12",
        "@testing-library/react": "^16.3.3",
        "@types/express": "^5.0.6",
        "@types/leaflet": "^1.9.21",
        "@types/node": "^25.5.0",
        "@types/react": "^19.2.14",
        "@types/react-dom": "^19.2.3",
        "@types/supertest": "^7.2.0",
        "@vitejs/plugin-react": "4.7.0",
        "concurrently": "^9.2.1",
        "dotenv": "^17.4.2",
        "express": "^5.2.1",
        "jsdom": "^29.1.1",
        "jsonwebtoken": "^9.0.3",
        "sharp": "0.35.5",
        "socket.io-client": "^4.8.3",
        "supertest": "^7.2.2",
        "tailwindcss": "4.1.12",
        "tsx": "^4.21.0",
        "vite": "6.3.5",
        "vite-plugin-pwa": "^1.2.0",
        "vitest": "^4.1.9"
      },
      "pnpm": {
        "overrides": {
          "vite": "6.3.5"
        }
      }
    }
    ✓ • 296ms

## Assistant

The worktree already has many unrelated changes, including current edits in `server/index.ts` and `AdminLayout.tsx`. I’ll preserve those and make only narrow additive changes around them. Phase 1 will include a real test-send through the existing FCM path, but no recurring worker or automatic delivery logic.

## Activity

    $ Get-Content server/services/auditLogger.ts; Get-Content server/routes/shiftSchedule.ts; $lines=Get-Content server/routes/notifications.ts; for($i=125;$i -le 295;$i++){"$i`:$($lines[$i-1])"}; $lines=Get-Content server/index.ts; for($i=1;$i -le 65;$i++){"$i`:$($lines[$i-1])"}; for($i=525;$i -le 590;$i++){"$i`:$($lines[$i-1])"}; $lines=Get-Content src/app/pages/Admin/AdminLayout.tsx; for($i=1;$i -le 75;$i++){"$i`:$($lines[$i-1])"}; for($i=250;$i -le 290;$i++){"$i`:$($lines[$i-1])"}
    import { pool } from '../db';
    
    /**
     * Enterprise Audit Logger (Phase 3.2)
     *
     * Records administrative and system-level actions for permanent traceability.
     */
    
    export interface AuditLogEntry {
      actor_id: string;
      actor_role: string;
      action: string;
      resource_type: string;
      resource_id: string;
      old_values?: any;
      new_values: any;
      ip_address?: string;
      user_agent?: string;
    }
    
    export const logAction = async (entry: AuditLogEntry) => {
      try {
        await pool.query(
          `INSERT INTO system_audit_logs
           (actor_id, actor_role, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.actor_id,
            entry.actor_role,
            entry.action,
            entry.resource_type,
            entry.resource_id,
            entry.old_values ? JSON.stringify(entry.old_values) : null,
            JSON.stringify(entry.new_values),
            entry.ip_address || null,
            entry.user_agent || null
          ]
        );
        console.log(`[AUDIT] Logged ${entry.action} on ${entry.resource_type}:${entry.resource_id}`);
      } catch (err) {
        console.error('[AUDIT] Failed to write log:', err);
        // Don't throw - we don't want to crash the main app if logging fails
      }
    };
    import { Router, Response } from 'express';
    import { pool } from '../db';
    import { AuthRequest, authorize } from '../middleware/auth';
    import { logAction } from '../services/auditLogger';
    import { getPendingSchedule, getPhilippineDateTime, getScheduleForDate, saveNextDaySchedule } from '../services/shiftSchedule';
    
    const router = Router();
    router.use(authorize(['admin']));
    
    router.get('/', async (_req: AuthRequest, res: Response) => {
      try {
        const date = getPhilippineDateTime(new Date()).date;
        const [current, pending] = await Promise.all([getScheduleForDate(pool, date), getPendingSchedule(pool, date)]);
        res.json({ date, time_zone: 'Asia/Manila', current, pending, default_end_time: '19:00' });
      } catch (error) {
        console.error('Shift schedule read failed:', error);
        res.status(500).json({ error: 'Failed to load shift hours' });
      }
    });
    
    router.put('/', async (req: AuthRequest, res: Response) => {
      try {
        const { start_time, end_time } = req.body || {};
        const date = getPhilippineDateTime(new Date()).date;
        const previous = await getPendingSchedule(pool, date);
        const saved = await saveNextDaySchedule(pool, req.user!.id, start_time, end_time);
        await logAction({ actor_id: req.user!.id, actor_role: 'admin', action: 'shift_schedule_updated',
          resource_type: 'shift_schedule', resource_id: saved.effective_date,
          old_values: previous, new_values: saved });
        res.json({ success: true, schedule: saved, time_zone: 'Asia/Manila' });
      } catch (error: any) {
        if (error?.message?.includes('Start time must be before')) return res.status(400).json({ error: error.message });
        console.error('Shift schedule save failed:', error);
        res.status(500).json({ error: 'Failed to save shift hours' });
      }
    });
    
    router.get('/cutoff-review', async (req: AuthRequest, res: Response) => {
      try {
        const date = String(req.query.date || getPhilippineDateTime(new Date()).date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date' });
        const [rows] = await pool.query(`SELECT ss.id AS session_id, ss.rider_id, u.name AS rider_name,
          ss.end_time, ss.active_task_count_at_end,
          (SELECT COUNT(*) FROM delivery_requests dr WHERE dr.assigned_rider_id=ss.rider_id
            AND dr.status='approved' AND COALESCE(dr.delivery_status,'') NOT IN ('completed','delivered','failed','cancelled','disapproved')) AS current_active_tasks
          FROM shift_sessions ss JOIN users u ON u.id=ss.rider_id
          WHERE DATE(ss.start_time)=? AND ss.end_source='scheduled' AND ss.active_task_count_at_end>0
          ORDER BY ss.end_time DESC`, [date]);
        res.json({ date, riders: rows });
      } catch (error) {
        console.error('Cutoff review read failed:', error);
        res.status(500).json({ error: 'Failed to load cutoff review' });
      }
    });
    
    export default router;
    125:    res.json({ success: true });
    126:  } catch (error) {
    127:    console.error('[WEB PUSH] Subscription deletion failed.');
    128:    res.status(500).json({ error: 'Unable to disable browser notifications' });
    129:  }
    130:});
    131:
    132:// Helper: Send Expo Push Notification
    133:export async function sendPushNotification(
    134:  userId: string,
    135:  title: string,
    136:  body: string,
    137:  data?: any,
    138:  options?: { channelId?: string; categoryId?: string; tag?: string },
    139:) {
    140:  try {
    141:    const [rows] = await pool.query('SELECT fcm_token, expo_push_token, role FROM users WHERE id = ?', [userId]) as any[];
    142:    if (rows[0]?.role !== 'rider') return;
    143:    const fcmToken = rows[0]?.fcm_token;
    144:    const token = rows[0]?.expo_push_token;
    145:    const urgentTypes = new Set([
    146:      'new_assignment', 'assignment_cancelled', 'conversation_message',
    147:      'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
    148:    ]);
    149:    const urgent = options?.channelId === 'delivery_urgent' || urgentTypes.has(String(data?.type || ''));
    150:    const notificationData = {
    151:      ...(data || {}),
    152:      eventId: data?.eventId || data?.notificationId || data?.messageId || data?.request_id || data?.requestId || data?.conversationId || `push-${Date.now()}`,
    153:    };
    154:
    155:    if (fcmToken) {
    156:      try {
    157:        await sendFcmNotification(fcmToken, {
    158:          title,
    159:          body,
    160:          data: notificationData,
    161:          channelId: urgent ? 'delivery_urgent' : options?.channelId || 'delivery_updates',
    162:          categoryId: options?.categoryId,
    163:          tag: options?.tag,
    164:          priority: urgent ? 'high' : 'normal',
    165:        });
    166:      } catch (error) {
    167:        if (isPermanentFcmTokenError(error)) {
    168:          await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, fcmToken]);
    169:        }
    170:        console.error('[FCM] Push delivery failed.');
    171:      }
    172:      return;
    173:    }
    174:
    175:    if (!token || !Expo.isExpoPushToken(token)) {
    176:      console.log(`âš ï¸ Invalid or missing Expo Push Token for user ${userId}`);
    177:      return;
    178:    }
    179:
    180:    const messages: any[] = [{
    181:      to: token,
    182:      sound: 'default',
    183:      title,
    184:      body,
    185:      data: notificationData,
    186:      priority: options?.channelId === 'delivery_updates' ? 'default' : 'high',
    187:      channelId: options?.channelId || 'default',
    188:      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    189:      ...(options?.tag ? { tag: options.tag } : {}),
    190:    }];
    191:
    192:    const chunks = expo.chunkPushNotifications(messages);
    193:    for (const chunk of chunks) {
    194:      await expo.sendPushNotificationsAsync(chunk);
    195:    }
    196:    console.log(`ðŸš€ Push notification sent to user ${userId}`);
    197:  } catch (err) {
    198:    console.error('[PUSH] Provider delivery failed.');
    199:  }
    200:}
    201:
    202:// Register Push Token
    203:router.post('/register-token', async (req, res) => {
    204:  try {
    205:    const user = (req as AuthRequest).user!;
    206:    const parsed = pushTokenSchema.safeParse(req.body);
    207:    if (!parsed.success) return res.status(400).json({ error: 'Invalid push token registration' });
    208:    if (user.role !== 'rider') return res.status(403).json({ error: 'Only riders can register mobile push tokens' });
    209:    const provider = parsed.data.provider || 'expo';
    210:    if (provider === 'fcm' && !parsed.data.platform) {
    211:      return res.status(400).json({ error: 'FCM platform is required' });
    212:    }
    213:    const update = provider === 'fcm'
    214:      ? 'UPDATE users SET fcm_token = ?, expo_push_token = NULL WHERE id = ?'
    215:      : 'UPDATE users SET expo_push_token = ? WHERE id = ?';
    216:    await pool.query(update, [parsed.data.token, user.id]);
    217:    console.log(`ðŸ“² Registered ${provider} push token for rider`);
    218:    res.json({ success: true });
    219:  } catch (error) {
    220:    console.error('Push registration failed.');
    221:    res.status(500).json({ error: 'Database error' });
    222:  }
    223:});
    224:
    225:router.post('/unregister-token', async (req, res) => {
    226:  try {
    227:    const user = (req as AuthRequest).user!;
    228:    const parsed = pushTokenRemovalSchema.safeParse(req.body);
    229:    if (!parsed.success) return res.status(400).json({ error: 'Invalid push token provider' });
    230:    if (user.role !== 'rider') return res.status(403).json({ error: 'Only riders can unregister mobile push tokens' });
    231:    const clearTokens = parsed.data.provider === 'fcm'
    232:      ? 'fcm_token = NULL, expo_push_token = NULL'
    233:      : 'expo_push_token = NULL';
    234:    await pool.query(`UPDATE users SET ${clearTokens} WHERE id = ?`, [user.id]);
    235:    res.json({ success: true });
    236:  } catch {
    237:    console.error('Push token unregistration failed.');
    238:    res.status(500).json({ error: 'Database error' });
    239:  }
    240:});
    241:
    242:// Get all notifications (Filtered by authenticated user)
    243:router.get('/', async (req: AuthRequest, res: Response) => {
    244:  try {
    245:    const user = req.user!;
    246:    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    247:    const params: any[] = [user.id];
    248:
    249:    // Limit to 50 to prevent UI flooding and DB strain
    250:    query += ' ORDER BY created_at DESC LIMIT 50';
    251:
    252:    const [rows] = await pool.query(query, params);
    253:    res.json(rows);
    254:  } catch (error) {
    255:    console.error(error);
    256:    res.status(500).json({ error: 'Database error' });
    257:  }
    258:});
    259:
    260:// Create a new notification
    261:router.post('/', notificationCreateLimiter, authorize(['admin']), async (req, res) => {
    262:  try {
    263:    const parsed = createNotificationSchema.safeParse(req.body);
    264:    if (!parsed.success) return res.status(400).json({ error: 'Invalid notification payload' });
    265:    const { user_id, message, type, request_id } = parsed.data;
    266:    const requestId = request_id ?? null;
    267:    const [recipients] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]) as any[];
    268:    if (!recipients.length) return res.status(404).json({ error: 'Notification recipient not found' });
    269:    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    270:
    271:    await pool.query(`
    272:      INSERT INTO notifications (id, user_id, message, type, request_id)
    273:      VALUES (?, ?, ?, ?, ?)
    274:    `, [id, user_id, message, type, requestId]);
    275:
    276:    await publishSavedWebPushNotification({ id, user_id, message, type, request_id: requestId || '' });
    277:
    278:    // REAL-TIME: Notify the specific user that they have a new notification
    279:    const io = req.app.get('io');
    280:    if (io) {
    281:      console.log(`ðŸ“¡ Emitting notification-added to user: ${user_id}`);
    282:      io.to(user_id).emit('notification-added', { id, message, type, request_id: requestId });
    283:    }
    284:
    285:    // PUSH NOTIFICATION: Show in notification bar
    286:    const title = type === 'new_assignment' ? 'ðŸ“¦ New Task Assigned' : 'ðŸ”” System Update';
    287:    await sendPushNotification(user_id, title, message, { notificationId: id, request_id: requestId, type });
    288:
    289:    res.json({ success: true, id });
    290:  } catch (error) {
    291:    console.error(error);
    292:    res.status(500).json({ error: 'Database error' });
    293:  }
    294:});
    295:
    1:import './db'; // Force environment variables to load first
    2:import Bugsnag from '@bugsnag/js';
    3:import BugsnagPluginExpress from '@bugsnag/plugin-express';
    4:import express from 'express';
    5:import cors from 'cors';
    6:import cookieParser from 'cookie-parser';
    7:import helmet from 'helmet';
    8:import rateLimit from 'express-rate-limit';
    9:import jwt from 'jsonwebtoken';
    10:import { createServer } from 'http';
    11:import { Server } from 'socket.io';
    12:import path from 'path';
    13:import fs from 'fs';
    14:import { fileURLToPath } from 'url';
    15:import authRoutes from './routes/auth';
    16:import requestRoutes from './routes/requests';
    17:import riderTaskRoutes from './routes/riderTasks';
    18:import notificationRoutes from './routes/notifications';
    19:import conversationRoutes, { resolveRequestConversation } from './routes/conversations';
    20:import userRoutes from './routes/users';
    21:import shiftScheduleRoutes from './routes/shiftSchedule';
    22:import analyticsRoutes from './routes/analytics';
    23:import routingRoutes from './routes/routing';
    24:import { pool } from './db';
    25:import { authenticate } from './middleware/auth';
    26:import { requireRiderWorkAccess } from './middleware/riderShiftAccess';
    27:import { idempotency } from './middleware/idempotency';
    28:import { onlineRiders, updateRiderPresence, removeRiderPresence, cleanupOfflineRiders } from './presence';
    29:import { handleRiderLocationUpdate, pruneTrackingState, riderLatestState } from './locationTracking';
    30:import { getLatestOfflineIncident, recordConnectivityLog } from './services/connectivityLogger';
    31:import { ensureWebPushTable, startWebPushWorker } from './services/webPush';
    32:import { publishSavedWebPushNotification } from './services/deliveryNotifications';
    33:import { ensureLocationEventReceiptsTable } from './services/locationEventReceipts';
    34:import { ensureMessagingTables } from './services/messaging';
    35:import { canAccessConversation } from './services/messaging';
    36:import { ensureAuthChallengesTable } from './services/authChallenges';
    37:import { startProactiveOverdueWorker } from './services/proactiveOverdue';
    38:import { ensureShiftScheduleTables } from './services/shiftSchedule';
    39:import { startShiftCutoffWorker } from './services/shiftCutoff';
    40:import { getJwtSecret, validateProductionSecurityConfig } from './config/security';
    41:
    42:validateProductionSecurityConfig();
    43:
    44:Bugsnag.start({
    45:  apiKey: process.env.BUGSNAG_API_KEY || '37b188b8dd7ad62347e11722b1b9036f',
    46:  plugins: [BugsnagPluginExpress],
    47:  releaseStage: process.env.NODE_ENV || 'development',
    48:  enabledReleaseStages: ['production', 'staging', 'development'],
    49:});
    50:
    51:const app = express();
    52:app.set('trust proxy', 1);
    53:const PORT = Number(process.env.PORT) || 3001;
    54:const bugsnagMiddleware = Bugsnag.getPlugin('express');
    55:
    56:if (bugsnagMiddleware) {
    57:  app.use(bugsnagMiddleware.requestHandler);
    58:}
    59:
    60:// Standard Security Practice: Use Helmet to set secure HTTP headers (CSP, HSTS, etc.)
    61:app.use(helmet({
    62:  contentSecurityPolicy: false, // Disable CSP for now to avoid breaking Leaflet/External maps
    63:  crossOriginEmbedderPolicy: false,
    64:  // OSM tile requests must identify the site without exposing page paths or queries.
    65:  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    525:    if (sessionRiderId) {
    526:      const rid = sessionRiderId;
    527:      setTimeout(async () => {
    528:        const currentData = onlineRiders.get(rid);
    529:        // ONLY remove if the rider hasn't reconnected with a NEW socket ID
    530:        // during the grace period (e.g. page refresh)
    531:        if (currentData && currentData.socketId === socket.id) {
    532:          // ENTERPRISE FIX: Use immediate removal logic
    533:          await removeRiderPresence(rid, io as any);
    534:        }
    535:      }, DISCONNECT_GRACE_PERIOD);
    536:    }
    537:  });
    538:});
    539:
    540:app.set('io', io);
    541:app.use('/api/auth', authRoutes);
    542:app.use('/api/conversations', authenticate, idempotency, conversationRoutes);
    543:app.get('/api/requests/:id/conversation', authenticate, idempotency, resolveRequestConversation);
    544:app.use('/api/users', authenticate, idempotency, userRoutes);
    545:app.use('/api/shift-schedule', authenticate, shiftScheduleRoutes);
    546:app.use('/api/requests', authenticate, idempotency, requireRiderWorkAccess, requestRoutes);
    547:app.use('/api/rider/tasks', authenticate, idempotency, riderTaskRoutes);
    548:app.use('/api/notifications', authenticate, idempotency, notificationRoutes);
    549:app.use('/api/analytics', authenticate, idempotency, analyticsRoutes);
    550:app.use('/api/routing', authenticate, routingRoutes);
    551:
    552:ensureWebPushTable()
    553:  .then(() => startWebPushWorker())
    554:  .catch((error) => console.error('[WEB PUSH] Startup initialization failed:', error));
    555:
    556:ensureLocationEventReceiptsTable()
    557:  .catch((error) => console.error('[LOCATION EVENTS] Startup initialization failed:', error));
    558:
    559:ensureMessagingTables()
    560:  .catch((error) => console.error('[MESSAGING] Startup initialization failed:', error));
    561:
    562:ensureAuthChallengesTable()
    563:  .catch((error) => console.error('[AUTH CHALLENGES] Startup initialization failed:', error));
    564:
    565:const clientDistPath = path.resolve(__dirname, '..', '..', 'dist');
    566:const clientIndexPath = path.join(clientDistPath, 'index.html');
    567:
    568:if (fs.existsSync(clientIndexPath)) {
    569:  app.use(express.static(clientDistPath));
    570:  app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)).*/, (req, res) => {
    571:    res.sendFile(clientIndexPath);
    572:  });
    573:} else {
    574:  console.warn(`Frontend build not found at ${clientDistPath}; serving API only.`);
    575:}
    576:
    577:const watchdog = new RequestWatchdog(io);
    578:watchdog.start();
    579:startProactiveOverdueWorker(io);
    580:ensureShiftScheduleTables()
    581:  .then(() => startShiftCutoffWorker(pool, io))
    582:  .catch((error) => console.error('[SHIFT HOURS] Startup initialization failed:', error));
    583:
    584:if (bugsnagMiddleware) {
    585:  app.use(bugsnagMiddleware.errorHandler);
    586:}
    587:
    588:httpServer.listen(PORT, '0.0.0.0', () => {
    589:  console.log(`ðŸš€ Backend server LIVE on port ${PORT}`);
    590:});
    1:import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
    2:import { useNavigate, useSearchParams } from 'react-router';
    3:import { useAuth } from '../../context/AuthContext';
    4:import { useData } from '../../context/DataContext';
    5:import { WebPushSettings } from '../../components/WebPushSettings';
    6:import { Button } from '../../components/ui/button';
    7:import { Badge } from '../../components/ui/badge';
    8:import { cn } from '../../components/ui/utils';
    9:import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
    10:import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
    11:import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
    12:import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare, Clock3 } from 'lucide-react';
    13:import { NotificationBell } from '../../components/Admin/NotificationBell';
    14:import { FloatingRiderMessagePreview } from '../../components/Admin/FloatingRiderMessagePreview';
    15:import { useRealTime } from '../../context/RealTimeContext';
    16:import './admin-performance.css';
    17:
    18:// Keep heavyweight admin views out of the initial shell bundle. Maps, charts,
    19:// and dispatch interactions are loaded only when the user opens that view.
    20:const DispatchConsole = lazy(() => import('./DispatchConsole').then(module => ({ default: module.DispatchConsole })));
    21:const AnalyticsHub = lazy(() => import('./AnalyticsHub').then(module => ({ default: module.AnalyticsHub })));
    22:const UserManagement = lazy(() => import('./UserManagement').then(module => ({ default: module.UserManagement })));
    23:const ThemeSelection = lazy(() => import('./ThemeSelection').then(module => ({ default: module.ThemeSelection })));
    24:const CalendarView = lazy(() => import('./CalendarView').then(module => ({ default: module.CalendarView })));
    25:const RiderMap = lazy(() => import('./RiderMap').then(module => ({ default: module.RiderMap })));
    26:const AttendanceDashboard = lazy(() => import('./AttendanceDashboard').then(module => ({ default: module.AttendanceDashboard })));
    27:const AdminMessaging = lazy(() => import('./AdminMessaging').then(module => ({ default: module.AdminMessaging })));
    28:const ShiftHours = lazy(() => import('./ShiftHours').then(module => ({ default: module.ShiftHours })));
    29:
    30:type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance';
    31:
    32:const ADMIN_MAIN_NAVIGATION = [
    33:  { view: 'dispatch', label: 'Dispatch Console', icon: Truck },
    34:  { view: 'calendar', label: 'Calendar View', icon: Calendar },
    35:  { view: 'rider-map', label: 'Rider Map', icon: MapPin },
    36:  { view: 'messages', label: 'Inbox', icon: MessageSquare },
    37:  { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    38:  { view: 'analytics', label: 'Analytics Hub', icon: BarChart3 },
    39:  { view: 'users', label: 'User Management', icon: Users },
    40:] as const;
    41:
    42:export function AdminLayout() {
    43:  const { user, logout } = useAuth();
    44:  const { socket } = useRealTime();
    45:  const navigate = useNavigate();
    46:  const [searchParams, setSearchParams] = useSearchParams();
    47:  const openRequestId = searchParams.get('request');
    48:
    49:  const [currentView, setCurrentView] = useState<AdminView>('dispatch');
    50:  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
    51:  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
    52:  const [showProfile, setShowProfile] = useState(false);
    53:
    54:  useEffect(() => {
    55:    if (openRequestId) setCurrentView('dispatch');
    56:  }, [openRequestId]);
    57:
    58:  useEffect(() => {
    59:    if (currentView !== 'messages') setPendingConversationId(null);
    60:  }, [currentView]);
    61:
    62:  const handleLogout = () => {
    63:    logout();
    64:    navigate('/', { replace: true });
    65:  };
    66:
    67:  const openRiderConversation = (conversationId: string) => {
    68:    setPendingConversationId(conversationId);
    69:    setCurrentView('messages');
    70:  };
    71:
    72:  const openAdminRequest = useCallback((requestId: string) => {
    73:    setPendingRequestId(requestId);
    74:    setCurrentView('dispatch');
    75:    setSearchParams(current => {
    250:                      </DropdownMenuLabel>
    251:                      <DropdownMenuSeparator className="bg-slate-50" />
    252:                      <DropdownMenuItem onSelect={() => setShowProfile(true)} className="rounded py-1.5 font-bold cursor-pointer focus:bg-slate-50 text-[9px]">
    253:                        <UserCog className="mr-1.5 h-3 w-3 text-slate-500" />
    254:                        Profile
    255:                      </DropdownMenuItem>
    256:                      <DropdownMenuItem onSelect={handleLogout} className="rounded py-1.5 font-bold text-rose-600 cursor-pointer focus:bg-rose-50 text-[9px]">
    257:                        <LogOut className="mr-1.5 h-3 w-3" />
    258:                        Logout
    259:                      </DropdownMenuItem>
    260:                    </DropdownMenuContent>
    261:                  </DropdownMenu>
    262:                </div>
    263:              </div>
    264:            </div>
    265:          </header>
    266:
    267:        {/* Scrollable View Area */}
    268:        <main className={cn("min-h-0 min-w-0 flex-1 overscroll-contain pb-[env(safe-area-inset-bottom)]", (currentView === 'dispatch' || currentView === 'calendar' || currentView === 'messages' || currentView === 'rider-map' || currentView === 'attendance') ? "overflow-hidden" : "overflow-y-auto") }>
    269:          <Suspense fallback={
    270:            <div className="flex min-h-full items-center justify-center p-6 text-slate-500" role="status" aria-live="polite">
    271:              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    272:              <span className="sr-only">Loading admin view</span>
    273:            </div>
    274:          }>
    275:            {currentView === 'dispatch' && <DispatchConsole openRequestId={pendingRequestId || openRequestId || undefined} onOpenRequest={openAdminRequest} onRequestOpened={clearPendingRequest} />}
    276:            {currentView === 'calendar' && <CalendarView />}
    277:            {currentView === 'users' && <UserManagement />}
    278:            {currentView === 'analytics' && <AnalyticsHub />}
    279:            {currentView === 'theme' && <ThemeSelection />}
    280:            {currentView === 'shift-hours' && <ShiftHours onOpenAttendance={() => setCurrentView('attendance')} />}
    281:            {currentView === 'rider-map' && <RiderMap />}
    282:            {currentView === 'attendance' && <AttendanceDashboard />}
    283:            {currentView === 'messages' && <AdminMessaging
    284:              initialConversationId={pendingConversationId}
    285:              onInitialConversationOpened={() => setPendingConversationId(null)}
    286:            />}
    287:          </Suspense>
    288:        </main>
    289:      </div>
    290:
    ✓ • 246ms

## Activity

    $ Get-Content server/package.json; Get-Content server/db.ts; Get-Content src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx; rg -n "system_audit_logs|CREATE TABLE IF NOT EXISTS" server/services server/scripts | Select-Object -First 100; rg -n "ADMIN_MAIN_NAVIGATION|shift-hours|Theme Selection" src/app/pages/Admin/AdminLayout.tsx
    {
      "name": "backend",
      "version": "1.0.0",
      "private": true,
      "type": "commonjs",
      "scripts": {
        "dev": "node ../node_modules/tsx/dist/cli.mjs watch index.ts",
        "build": "tsc",
        "start": "node dist/index.js"
      },
      "dependencies": {
        "@bugsnag/js": "^8.9.0",
        "@bugsnag/plugin-express": "^8.9.0",
        "@types/argon2": "^0.14.1",
        "@types/cookie-parser": "^1.4.10",
        "@types/cors": "^2.8.19",
        "@types/express": "^5.0.6",
        "@types/node": "^20.19.37",
        "argon2": "^0.44.0",
        "bcryptjs": "^3.0.3",
        "cookie-parser": "^1.4.7",
        "cors": "^2.8.6",
        "dotenv": "^17.3.1",
        "expo-server-sdk": "^6.1.0",
        "express": "^5.2.1",
        "express-rate-limit": "^8.5.2",
        "firebase-admin": "^14.5.0",
        "helmet": "^8.1.0",
        "jsonwebtoken": "^9.0.3",
        "mysql2": "^3.18.2",
        "qrcode": "^1.5.4",
        "socket.io": "^4.8.3",
        "speakeasy": "^2.0.0",
        "typescript": "^5.0.0",
        "uuid": "^13.0.0",
        "web-push": "^3.6.7",
        "zod": "^4.3.6"
      },
      "devDependencies": {
        "@types/jsonwebtoken": "^9.0.10",
        "@types/qrcode": "^1.5.6",
        "@types/speakeasy": "^2.0.10",
        "@types/uuid": "^10.0.0",
        "ts-node-dev": "^2.0.0"
      }
    }
    import mysql from 'mysql2/promise';
    import dotenv from 'dotenv';
    import path from 'path';
    import fs from 'fs';
    
    // Try to load .env from several possible locations
    const envPaths = [
      path.join(process.cwd(), '.env'),          // Current working directory
      path.join(__dirname, '.env'),               // Same directory as the script
      path.join(__dirname, '..', '.env'),        // Parent directory (useful for dist/)
      path.join(__dirname, '..', '..', '.env'),  // Two levels up (useful for deeper routes)
    ];
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
      }
    }
    
    export const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'), // Support for Aiven port
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rider_scheduling',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      timezone: '+08:00'
    });
    
    // Startup check
    pool.getConnection()
       .then(conn => {
         console.log(`âœ… DB Connected: ${process.env.DB_NAME} on port
    ${process.env.DB_PORT || '3306'}`);
         conn.release();
    })
      .catch(err => {
         console.error('âŒ DB Connection Failed:', err.message);
    });
    // @vitest-environment jsdom
    import { describe, expect, it, vi } from 'vitest';
    import { render, screen, within } from '@testing-library/react';
    import { MemoryRouter } from 'react-router';
    
    vi.mock('../../../context/AuthContext', () => ({
      useAuth: () => ({ user: { name: 'Admin', email: 'admin@example.test' }, logout: vi.fn() }),
    }));
    vi.mock('../../../context/RealTimeContext', () => ({ useRealTime: () => ({ socket: null }) }));
    vi.mock('../../../components/Admin/NotificationBell', () => ({ NotificationBell: () => null }));
    vi.mock('../DispatchConsole', () => ({ DispatchConsole: () => null }));
    vi.mock('../AnalyticsHub', () => ({ AnalyticsHub: () => null }));
    vi.mock('../UserManagement', () => ({ UserManagement: () => null }));
    vi.mock('../ThemeSelection', () => ({ default: () => null }));
    vi.mock('../CalendarView', () => ({ CalendarView: () => null }));
    vi.mock('../RiderMap', () => ({ RiderMap: () => null }));
    vi.mock('../AttendanceDashboard', () => ({ AttendanceDashboard: () => null }));
    vi.mock('../AdminMessaging', () => ({ AdminMessaging: () => null }));
    
    import { AdminLayout } from '../AdminLayout';
    
    describe('admin sidebar navigation order', () => {
      it('shows operations, monitoring, and administration in the agreed order', () => {
        render(<MemoryRouter><AdminLayout /></MemoryRouter>);
    
        const mainMenu = screen.getAllByText('Main Menu')[0].closest('nav');
        expect(mainMenu).not.toBeNull();
        const labels = within(mainMenu!).getAllByRole('button').map(button => button.textContent?.trim());
    
        expect(labels.slice(0, 7)).toEqual([
          'Dispatch Console',
          'Calendar View',
          'Rider Map',
          'Inbox',
          'Attendance',
          'Analytics Hub',
          'User Management',
        ]);
      });
    });
    server/services\webPushQueue.ts:83:    CREATE TABLE IF NOT EXISTS web_push_queue (
    server/services\webPushQueue.ts:98:    CREATE TABLE IF NOT EXISTS web_push_deliveries (
    server/services\webPushQueue.ts:115:    CREATE TABLE IF NOT EXISTS web_push_queue_state (
    server/services\webPush.ts:31:    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
    server/scripts\2026-10-21-rider-status-operations.sql:1:CREATE TABLE IF NOT EXISTS rider_status_operations (
    server/services\__tests__\messaging.test.ts:135:    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS conversations');
    server/services\__tests__\messaging.test.ts:138:    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS conversation_participants');
    server/services\__tests__\messaging.test.ts:140:    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS messages');
    server/services\authChallenges.ts:16:      CREATE TABLE IF NOT EXISTS auth_challenges (
    server/services\auditLogger.ts:24:      `INSERT INTO system_audit_logs
    server/services\locationEventReceipts.ts:8:    CREATE TABLE IF NOT EXISTS location_event_receipts (
    server/services\shiftSchedule.ts:53:  await db.query(`CREATE TABLE IF NOT EXISTS shift_schedule_revisions (
    server/services\riderAvatarPreferences.ts:7:    CREATE TABLE IF NOT EXISTS rider_avatar_preferences (
    server/services\messaging.ts:69:        CREATE TABLE IF NOT EXISTS conversations (
    server/services\messaging.ts:83:        CREATE TABLE IF NOT EXISTS conversation_participants (
    server/services\messaging.ts:93:        CREATE TABLE IF NOT EXISTS messages (
    30:type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance';
    32:const ADMIN_MAIN_NAVIGATION = [
    104:          {ADMIN_MAIN_NAVIGATION.map(({ view, label, icon: Icon }) => (
    116:          <button onClick={() => setCurrentView('shift-hours')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'shift-hours' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    125:            <span className="text-[11px]">Theme Selection</span>
    191:                      {ADMIN_MAIN_NAVIGATION.map(({ view, label, icon: Icon }) => (
    204:                      <SheetTrigger asChild><button onClick={() => setCurrentView('shift-hours')} className={`min-h-11 w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${currentView === 'shift-hours' ? 'bg-primary text-white' : 'text-slate-400'}`}><Clock3 size={14} /><span className="text-xs">Shift Hours</span></button></SheetTrigger>
    212:                          <span className="text-xs">Theme Selection</span>
    219:                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
    280:            {currentView === 'shift-hours' && <ShiftHours onOpenAttendance={() => setCurrentView('attendance')} />}
    ✓ • 194ms

## Assistant

The existing system already has `sendPushNotification`, token cleanup, audit logging, and startup table initializers, so Phase 1 can stay additive. I’m now adding the campaign schema/service and secured lifecycle routes first, then I’ll connect the admin screen to them.

## Activity

    file changes: Completed · 2 changes
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\scripts\2026-10-25-notification-campaigns.sql
    CREATE TABLE IF NOT EXISTS notification_campaigns (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      notification_title VARCHAR(120) NOT NULL,
      notification_body VARCHAR(500) NOT NULL,
      status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
      target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
      schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
      start_date DATE NOT NULL,
      end_date DATE NULL,
      send_time TIME NOT NULL,
      time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
      weekdays JSON NULL,
      repeat_interval_minutes INT NULL,
      max_sends_per_rider INT NOT NULL DEFAULT 1,
      destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
      created_by VARCHAR(64) NOT NULL,
      updated_by VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_campaign_status_start (status, start_date, send_time),
      CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
      CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
      campaign_id VARCHAR(64) NOT NULL,
      rider_id VARCHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (campaign_id, rider_id),
      CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
      CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
      id VARCHAR(64) PRIMARY KEY,
      campaign_id VARCHAR(64) NOT NULL,
      rider_id VARCHAR(64) NOT NULL,
      scheduled_at DATETIME NOT NULL,
      attempt_number INT NOT NULL DEFAULT 1,
      status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
      provider_message_id VARCHAR(255) NULL,
      failure_reason VARCHAR(500) NULL,
      idempotency_key VARCHAR(191) NOT NULL,
      sent_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
      INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
      CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
      CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    );
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaigns.ts
    import crypto from 'crypto';
    
    export type CampaignDb = { query: (sql: string, values?: any[]) => Promise<any> };
    
    export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] as const;
    export const CAMPAIGN_TARGETS = ['all_riders', 'selected_riders', 'no_attendance', 'present', 'absent_or_leave', 'on_duty', 'off_duty', 'active_tasks', 'overdue_tasks'] as const;
    export const CAMPAIGN_DESTINATIONS = ['dashboard', 'shift', 'today', 'overdue', 'inbox'] as const;
    
    export async function ensureNotificationCampaignTables(db: CampaignDb): Promise<void> {
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaigns (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        notification_title VARCHAR(120) NOT NULL,
        notification_body VARCHAR(500) NOT NULL,
        status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
        target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
        schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
        start_date DATE NOT NULL,
        end_date DATE NULL,
        send_time TIME NOT NULL,
        time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
        weekdays JSON NULL,
        repeat_interval_minutes INT NULL,
        max_sends_per_rider INT NOT NULL DEFAULT 1,
        destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
        created_by VARCHAR(64) NOT NULL,
        updated_by VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign_status_start (status, start_date, send_time),
        CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, rider_id),
        CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
        id VARCHAR(64) PRIMARY KEY,
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(64) NOT NULL,
        scheduled_at DATETIME NOT NULL,
        attempt_number INT NOT NULL DEFAULT 1,
        status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
        provider_message_id VARCHAR(255) NULL,
        failure_reason VARCHAR(500) NULL,
        idempotency_key VARCHAR(191) NOT NULL,
        sent_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
        INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
        CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    }
    
    export function newCampaignId(): string {
      return `campaign_${crypto.randomUUID()}`;
    }
    

## Activity

    file changes: Completed · 1 changes
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    import crypto from 'crypto';
    import { Router, Response } from 'express';
    import { z } from 'zod';
    import { pool } from '../db';
    import { AuthRequest, authorize } from '../middleware/auth';
    import { logAction } from '../services/auditLogger';
    import { CAMPAIGN_DESTINATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TARGETS, newCampaignId } from '../services/notificationCampaigns';
    import { sendPushNotification } from './notifications';
    
    const router = Router();
    router.use(authorize(['admin']));
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const campaignInput = z.object({
      name: z.string().trim().min(2).max(120),
      notification_title: z.string().trim().min(1).max(120),
      notification_body: z.string().trim().min(1).max(500),
      target_type: z.enum(CAMPAIGN_TARGETS),
      schedule_type: z.enum(['immediate', 'one_time', 'recurring']),
      start_date: z.string().regex(datePattern),
      end_date: z.string().regex(datePattern).nullable().optional(),
      send_time: z.string().regex(timePattern),
      weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
      repeat_interval_minutes: z.number().int().min(5).max(10080).nullable().optional(),
      max_sends_per_rider: z.number().int().min(1).max(20),
      destination: z.enum(CAMPAIGN_DESTINATIONS),
      rider_ids: z.array(z.string().min(1).max(64)).max(500).default([]),
    }).superRefine((value, ctx) => {
      if (value.end_date && value.end_date < value.start_date) ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'End date must be on or after start date' });
      if (value.schedule_type === 'recurring' && value.weekdays.length === 0) ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Select at least one weekday' });
      if (value.target_type === 'selected_riders' && value.rider_ids.length === 0) ctx.addIssue({ code: 'custom', path: ['rider_ids'], message: 'Select at least one rider' });
    });
    
    const lifecycle: Record<string, { from: string[]; to: typeof CAMPAIGN_STATUSES[number] }> = {
      activate: { from: ['draft', 'paused'], to: 'active' },
      pause: { from: ['active', 'scheduled'], to: 'paused' },
      resume: { from: ['paused'], to: 'active' },
      cancel: { from: ['draft', 'scheduled', 'active', 'paused'], to: 'cancelled' },
    };
    
    function normalizeCampaign(row: any) {
      return {
        ...row,
        weekdays: typeof row.weekdays === 'string' ? JSON.parse(row.weekdays || '[]') : row.weekdays || [],
        recipient_count: Number(row.recipient_count || 0),
        delivery_count: Number(row.delivery_count || 0),
      };
    }
    
    async function getCampaign(id: string) {
      const [rows]: any = await pool.query(`SELECT c.*,
        (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
        (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
        FROM notification_campaigns c WHERE c.id=? LIMIT 1`, [id]);
      if (!rows[0]) return null;
      const [recipients]: any = await pool.query(`SELECT u.id, u.name, u.email FROM notification_campaign_recipients cr
        JOIN users u ON u.id=cr.rider_id WHERE cr.campaign_id=? ORDER BY u.name`, [id]);
      return { ...normalizeCampaign(rows[0]), recipients };
    }
    
    async function audit(req: AuthRequest, action: string, campaignId: string, oldValues: any, newValues: any) {
      await logAction({ actor_id: String(req.user!.id), actor_role: 'admin', action, resource_type: 'notification_campaign',
        resource_id: campaignId, old_values: oldValues, new_values: newValues,
        ip_address: req.ip, user_agent: req.get('user-agent') || undefined });
    }
    
    router.get('/riders', async (_req: AuthRequest, res: Response) => {
      const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND status <> 'inactive' ORDER BY name");
      res.json(rows);
    });
    
    router.get('/', async (_req: AuthRequest, res: Response) => {
      try {
        const [rows]: any = await pool.query(`SELECT c.*,
          (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
          (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
          FROM notification_campaigns c ORDER BY c.updated_at DESC`);
        res.json(rows.map(normalizeCampaign));
      } catch (error) {
        console.error('Campaign list failed:', error);
        res.status(500).json({ error: 'Failed to load notification campaigns' });
      }
    });
    
    router.get('/:id/deliveries', async (req: AuthRequest, res: Response) => {
      const [rows] = await pool.query(`SELECT d.*, u.name rider_name, u.email rider_email
        FROM notification_campaign_deliveries d JOIN users u ON u.id=d.rider_id
        WHERE d.campaign_id=? ORDER BY d.created_at DESC LIMIT 500`, [String(req.params.id)]);
      res.json(rows);
    });
    
    router.get('/:id', async (req: AuthRequest, res: Response) => {
      const campaign = await getCampaign(String(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      res.json(campaign);
    });
    
    router.post('/', async (req: AuthRequest, res: Response) => {
      const parsed = campaignInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
      const data = parsed.data;
      const id = newCampaignId();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`INSERT INTO notification_campaigns
          (id,name,notification_title,notification_body,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
          VALUES (?,?,?,?,?,?,?,?,?,'Asia/Manila',?,?,?,?,?,?)`, [id, data.name, data.notification_title, data.notification_body,
          data.target_type, data.schedule_type, data.start_date, data.end_date || null, data.send_time, JSON.stringify(data.weekdays),
          data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, req.user!.id]);
        for (const riderId of new Set(data.rider_ids)) {
          await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
            SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
        }
        await conn.commit();
        const created = await getCampaign(id);
        await audit(req, 'notification_campaign_created', id, null, created);
        res.status(201).json(created);
      } catch (error: any) {
        await conn.rollback();
        console.error('Campaign creation failed:', error);
        res.status(error?.code === 'ER_NO_REFERENCED_ROW_2' ? 400 : 500).json({ error: 'Failed to create notification campaign' });
      } finally { conn.release(); }
    });
    
    router.patch('/:id', async (req: AuthRequest, res: Response) => {
      const id = String(req.params.id);
      const parsed = campaignInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
      const previous = await getCampaign(id);
      if (!previous) return res.status(404).json({ error: 'Campaign not found' });
      if (!['draft', 'paused'].includes(previous.status)) return res.status(409).json({ error: 'Only draft or paused campaigns can be edited' });
      const data = parsed.data;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`UPDATE notification_campaigns SET name=?,notification_title=?,notification_body=?,target_type=?,schedule_type=?,
          start_date=?,end_date=?,send_time=?,weekdays=?,repeat_interval_minutes=?,max_sends_per_rider=?,destination=?,updated_by=? WHERE id=?`,
        [data.name, data.notification_title, data.notification_body, data.target_type, data.schedule_type, data.start_date, data.end_date || null,
          data.send_time, JSON.stringify(data.weekdays), data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, id]);
        await conn.query('DELETE FROM notification_campaign_recipients WHERE campaign_id=?', [id]);
        for (const riderId of new Set(data.rider_ids)) {
          await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
            SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
        }
        await conn.commit();
        const updated = await getCampaign(id);
        await audit(req, 'notification_campaign_updated', id, previous, updated);
        res.json(updated);
      } catch (error) {
        await conn.rollback();
        console.error('Campaign update failed:', error);
        res.status(500).json({ error: 'Failed to update notification campaign' });
      } finally { conn.release(); }
    });
    
    router.post('/:id/:action(activate|pause|resume|cancel)', async (req: AuthRequest, res: Response) => {
      const id = String(req.params.id);
      const action = String(req.params.action);
      const transition = lifecycle[action];
      const previous = await getCampaign(id);
      if (!previous) return res.status(404).json({ error: 'Campaign not found' });
      if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
      await pool.query('UPDATE notification_campaigns SET status=?, updated_by=? WHERE id=?', [transition.to, req.user!.id, id]);
      const updated = await getCampaign(id);
      await audit(req, `notification_campaign_${action}d`, id, { status: previous.status }, { status: transition.to });
      res.json(updated);
    });
    
    router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
      const source = await getCampaign(String(req.params.id));
      if (!source) return res.status(404).json({ error: 'Campaign not found' });
      const id = newCampaignId();
      await pool.query(`INSERT INTO notification_campaigns
        (id,name,notification_title,notification_body,status,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
        SELECT ?,CONCAT(name,' (Copy)'),notification_title,notification_body,'draft',target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,?,?
        FROM notification_campaigns WHERE id=?`, [id, req.user!.id, req.user!.id, source.id]);
      await pool.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
        SELECT ?,rider_id FROM notification_campaign_recipients WHERE campaign_id=?`, [id, source.id]);
      const duplicate = await getCampaign(id);
      await audit(req, 'notification_campaign_duplicated', id, { source_id: source.id }, duplicate);
      res.status(201).json(duplicate);
    });
    
    router.post('/:id/test', async (req: AuthRequest, res: Response) => {
      const campaign = await getCampaign(String(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      const riderId = z.string().min(1).max(64).safeParse(req.body?.rider_id);
      if (!riderId.success) return res.status(400).json({ error: 'Select a rider for the test notification' });
      const [riders]: any = await pool.query("SELECT id FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
      if (!riders[0]) return res.status(404).json({ error: 'Rider not found' });
      const notificationId = `notif_${crypto.randomUUID()}`;
      await pool.query(`INSERT INTO notifications (id,user_id,message,type,request_id) VALUES (?,? ,?,'campaign_test',NULL)`,
        [notificationId, riderId.data, `[TEST] ${campaign.notification_body}`]);
      req.app.get('io')?.to(riderId.data).emit('notification-added', { id: notificationId, message: `[TEST] ${campaign.notification_body}`, type: 'campaign_test' });
      await sendPushNotification(riderId.data, `[TEST] ${campaign.notification_title}`, campaign.notification_body,
        { type: 'campaign_test', campaignId: campaign.id, notificationId, destination: campaign.destination });
      await audit(req, 'notification_campaign_test_sent', campaign.id, null, { rider_id: riderId.data, notification_id: notificationId });
      res.json({ success: true, notification_id: notificationId });
    });
    
    export default router;

## Activity

    file changes: Completed · 2 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\index.ts
    @@ -18,2 +18,3 @@
     import notificationRoutes from './routes/notifications';
    +import notificationCampaignRoutes from './routes/notificationCampaigns';
     import conversationRoutes, { resolveRequestConversation } from './routes/conversations';
    @@ -39,2 +40,3 @@
     import { startShiftCutoffWorker } from './services/shiftCutoff';
    +import { ensureNotificationCampaignTables } from './services/notificationCampaigns';
     import { getJwtSecret, validateProductionSecurityConfig } from './config/security';
    @@ -548,2 +550,3 @@
     app.use('/api/notifications', authenticate, idempotency, notificationRoutes);
    +app.use('/api/notification-campaigns', authenticate, idempotency, notificationCampaignRoutes);
     app.use('/api/analytics', authenticate, idempotency, analyticsRoutes);
    @@ -564,2 +567,5 @@
     
    +ensureNotificationCampaignTables(pool)
    +  .catch((error) => console.error('[NOTIFICATION CAMPAIGNS] Startup initialization failed:', error));
    +
     const clientDistPath = path.resolve(__dirname, '..', '..', 'dist');
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    @@ -157,15 +157,2 @@
     
    -router.post('/:id/:action(activate|pause|resume|cancel)', async (req: AuthRequest, res: Response) => {
    -  const id = String(req.params.id);
    -  const action = String(req.params.action);
    -  const transition = lifecycle[action];
    -  const previous = await getCampaign(id);
    -  if (!previous) return res.status(404).json({ error: 'Campaign not found' });
    -  if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
    -  await pool.query('UPDATE notification_campaigns SET status=?, updated_by=? WHERE id=?', [transition.to, req.user!.id, id]);
    -  const updated = await getCampaign(id);
    -  await audit(req, `notification_campaign_${action}d`, id, { status: previous.status }, { status: transition.to });
    -  res.json(updated);
    -});
    -
     router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
    @@ -202,2 +189,16 @@
     
    +for (const action of Object.keys(lifecycle)) {
    +  router.post(`/:id/${action}`, async (req: AuthRequest, res: Response) => {
    +    const id = String(req.params.id);
    +    const transition = lifecycle[action];
    +    const previous = await getCampaign(id);
    +    if (!previous) return res.status(404).json({ error: 'Campaign not found' });
    +    if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
    +    await pool.query('UPDATE notification_campaigns SET status=?, updated_by=? WHERE id=?', [transition.to, req.user!.id, id]);
    +    const updated = await getCampaign(id);
    +    await audit(req, `notification_campaign_${action}d`, id, { status: previous.status }, { status: transition.to });
    +    res.json(updated);
    +  });
    +}
    +
     export default router;

## Activity

    file changes: Completed · 2 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\src\app\pages\Admin\AdminLayout.tsx
    @@ -11,3 +11,3 @@
     import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
    -import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare, Clock3 } from 'lucide-react';
    +import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare, Clock3, BellRing } from 'lucide-react';
     import { NotificationBell } from '../../components/Admin/NotificationBell';
    @@ -28,4 +28,5 @@
     const ShiftHours = lazy(() => import('./ShiftHours').then(module => ({ default: module.ShiftHours })));
    +const NotificationCampaigns = lazy(() => import('./NotificationCampaigns').then(module => ({ default: module.NotificationCampaigns })));
     
    -type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance';
    +type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance' | 'campaigns';
     
    @@ -37,2 +38,3 @@
       { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    +  { view: 'campaigns', label: 'Notification Campaigns', icon: BellRing },
       { view: 'analytics', label: 'Analytics Hub', icon: BarChart3 },
    @@ -218,3 +220,3 @@
                     <h1 className="min-w-0 truncate font-black text-slate-900 text-xs md:hidden uppercase tracking-widest">
    -                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
    +                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'campaigns' ? 'Notification Campaigns' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
                     </h1>
    @@ -282,2 +284,3 @@
                 {currentView === 'attendance' && <AttendanceDashboard />}
    +            {currentView === 'campaigns' && <NotificationCampaigns />}
                 {currentView === 'messages' && <AdminMessaging
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\src\app\pages\Admin\NotificationCampaigns.tsx
    import { useCallback, useEffect, useMemo, useState } from 'react';
    import { BellRing, CalendarClock, Copy, Loader2, Pause, Play, Plus, Send, XCircle } from 'lucide-react';
    import { toast } from 'sonner';
    import { Button } from '../../components/ui/button';
    import { Card } from '../../components/ui/card';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
    
    type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
    type Campaign = {
      id: string; name: string; notification_title: string; notification_body: string; status: CampaignStatus;
      target_type: string; schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string | null;
      send_time: string; weekdays: number[]; repeat_interval_minutes: number | null; max_sends_per_rider: number;
      destination: string; recipient_count: number; delivery_count: number; recipients?: Rider[];
    };
    type Rider = { id: string; name: string; email: string };
    
    const weekdayOptions = [
      [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
    ] as const;
    const targetOptions = [
      ['all_riders', 'All riders'], ['selected_riders', 'Selected riders'], ['no_attendance', 'No attendance'],
      ['present', 'Present riders'], ['absent_or_leave', 'Absent or on leave'], ['on_duty', 'On-duty riders'],
      ['off_duty', 'Off-duty riders'], ['active_tasks', 'Riders with active tasks'], ['overdue_tasks', 'Riders with overdue tasks'],
    ] as const;
    const destinationOptions = [
      ['dashboard', 'Rider dashboard'], ['shift', 'Shift controls'], ['today', "Today's tasks"], ['overdue', 'Overdue tasks'], ['inbox', 'Inbox'],
    ] as const;
    
    const philippineDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const emptyForm = () => ({
      name: '', notification_title: '', notification_body: '', target_type: 'all_riders', schedule_type: 'one_time' as const,
      start_date: philippineDate(), end_date: '', send_time: '08:00', weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: '',
      max_sends_per_rider: 1, destination: 'dashboard', rider_ids: [] as string[],
    });
    type CampaignForm = ReturnType<typeof emptyForm>;
    
    async function request(path: string, init?: RequestInit) {
      const response = await fetch(`/api/notification-campaigns${path}`, {
        credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Campaign request failed');
      return data;
    }
    
    export function NotificationCampaigns() {
      const [campaigns, setCampaigns] = useState<Campaign[]>([]);
      const [riders, setRiders] = useState<Rider[]>([]);
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState(false);
      const [editorOpen, setEditorOpen] = useState(false);
      const [editingId, setEditingId] = useState<string | null>(null);
      const [form, setForm] = useState<CampaignForm>(emptyForm);
      const [testCampaign, setTestCampaign] = useState<Campaign | null>(null);
      const [testRiderId, setTestRiderId] = useState('');
    
      const load = useCallback(async () => {
        setLoading(true);
        try {
          const [campaignData, riderData] = await Promise.all([request('/'), request('/riders')]);
          setCampaigns(campaignData);
          setRiders(riderData);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load campaigns'); }
        finally { setLoading(false); }
      }, []);
      useEffect(() => { void load(); }, [load]);
    
      const stats = useMemo(() => ({
        total: campaigns.length,
        active: campaigns.filter(item => item.status === 'active').length,
        draft: campaigns.filter(item => item.status === 'draft').length,
        paused: campaigns.filter(item => item.status === 'paused').length,
      }), [campaigns]);
    
      const openCreate = () => { setEditingId(null); setForm(emptyForm()); setEditorOpen(true); };
      const openEdit = async (campaign: Campaign) => {
        try {
          const detail: Campaign = await request(`/${campaign.id}`);
          setEditingId(campaign.id);
          setForm({
            name: detail.name, notification_title: detail.notification_title, notification_body: detail.notification_body,
            target_type: detail.target_type, schedule_type: detail.schedule_type, start_date: detail.start_date.slice(0, 10),
            end_date: detail.end_date?.slice(0, 10) || '', send_time: detail.send_time.slice(0, 5), weekdays: detail.weekdays || [],
            repeat_interval_minutes: detail.repeat_interval_minutes == null ? '' : String(detail.repeat_interval_minutes),
            max_sends_per_rider: detail.max_sends_per_rider, destination: detail.destination,
            rider_ids: detail.recipients?.map(rider => rider.id) || [],
          });
          setEditorOpen(true);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to open campaign'); }
      };
    
      const saveCampaign = async () => {
        setSaving(true);
        try {
          const payload = { ...form, end_date: form.end_date || null,
            repeat_interval_minutes: form.repeat_interval_minutes === '' ? null : Number(form.repeat_interval_minutes) };
          await request(editingId ? `/${editingId}` : '/', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
          toast.success(editingId ? 'Campaign updated' : 'Campaign created');
          setEditorOpen(false);
          await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save campaign'); }
        finally { setSaving(false); }
      };
    
      const perform = async (campaign: Campaign, action: string) => {
        if (action === 'cancel' && !window.confirm(`Cancel “${campaign.name}”?`)) return;
        try {
          await request(`/${campaign.id}/${action}`, { method: 'POST' });
          toast.success(`Campaign ${action === 'duplicate' ? 'duplicated' : `${action}d`}`);
          await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Campaign action failed'); }
      };
    
      const sendTest = async () => {
        if (!testCampaign || !testRiderId) return;
        setSaving(true);
        try {
          await request(`/${testCampaign.id}/test`, { method: 'POST', body: JSON.stringify({ rider_id: testRiderId }) });
          toast.success('Test notification sent'); setTestCampaign(null); setTestRiderId('');
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Test notification failed'); }
        finally { setSaving(false); }
      };
    
      return <div className="min-h-full bg-slate-50/60 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="flex items-center gap-3 text-2xl font-black text-slate-900"><BellRing className="text-primary" />Notification Campaigns</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Create and prepare rider push campaigns. Automatic scheduling is added in Phase 2.</p></div>
            <Button onClick={openCreate} className="min-h-11"><Plus className="mr-2 h-4 w-4" />New campaign</Button>
          </div>
    
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Object.entries(stats).map(([label, value]) => <Card key={label} className="p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></Card>)}
          </div>
    
          {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Loading campaigns</span></div>
            : campaigns.length === 0 ? <Card className="p-12 text-center"><BellRing className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-700">No campaigns yet</h2><p className="mt-1 text-sm text-slate-500">Create your first rider notification campaign.</p></Card>
            : <div className="grid gap-4 xl:grid-cols-2">{campaigns.map(campaign => <Card key={campaign.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{campaign.name}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{campaign.status}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{campaign.notification_title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.notification_body}</p></div><CalendarClock className="h-5 w-5 shrink-0 text-slate-400" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="font-black text-slate-400">TARGET</span><p className="mt-1 font-bold text-slate-700">{targetOptions.find(([id]) => id === campaign.target_type)?.[1]}</p></div><div><span className="font-black text-slate-400">SCHEDULE</span><p className="mt-1 font-bold text-slate-700">{campaign.start_date.slice(0, 10)} · {campaign.send_time.slice(0, 5)}</p></div><div><span className="font-black text-slate-400">LIMIT</span><p className="mt-1 font-bold text-slate-700">{campaign.max_sends_per_rider} per rider</p></div><div><span className="font-black text-slate-400">DESTINATION</span><p className="mt-1 font-bold capitalize text-slate-700">{campaign.destination}</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['draft', 'paused'].includes(campaign.status) && <Button size="sm" variant="outline" onClick={() => void openEdit(campaign)}>Edit</Button>}
                {['draft', 'paused'].includes(campaign.status) && <Button size="sm" onClick={() => void perform(campaign, campaign.status === 'paused' ? 'resume' : 'activate')}><Play className="mr-1 h-3.5 w-3.5" />{campaign.status === 'paused' ? 'Resume' : 'Activate'}</Button>}
                {campaign.status === 'active' && <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'pause')}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>}
                <Button size="sm" variant="outline" onClick={() => { setTestCampaign(campaign); setTestRiderId(''); }}><Send className="mr-1 h-3.5 w-3.5" />Test</Button>
                <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'duplicate')}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
                {!['cancelled', 'completed'].includes(campaign.status) && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void perform(campaign, 'cancel')}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
              </div>
            </Card>)}</div>}
        </div>
    
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? 'Edit campaign' : 'Create campaign'}</DialogTitle><DialogDescription>Configure the audience and delivery schedule in Philippine time.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name"><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} /></Field>
            <Field label="Notification title"><input value={form.notification_title} onChange={event => setForm({ ...form, notification_title: event.target.value })} maxLength={120} /></Field>
            <Field label="Message" wide><textarea value={form.notification_body} onChange={event => setForm({ ...form, notification_body: event.target.value })} maxLength={500} rows={3} /></Field>
            <Field label="Recipients"><select value={form.target_type} onChange={event => setForm({ ...form, target_type: event.target.value })}>{targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Destination"><select value={form.destination} onChange={event => setForm({ ...form, destination: event.target.value })}>{destinationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            {form.target_type === 'selected_riders' && <Field label="Select riders" wide><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">{riders.map(rider => <label key={rider.id} className="flex min-h-10 items-center gap-2 rounded px-2 hover:bg-slate-50"><input type="checkbox" checked={form.rider_ids.includes(rider.id)} onChange={event => setForm({ ...form, rider_ids: event.target.checked ? [...form.rider_ids, rider.id] : form.rider_ids.filter(id => id !== rider.id) })} /><span className="text-sm font-semibold">{rider.name}</span><span className="text-xs text-slate-400">{rider.email}</span></label>)}</div></Field>}
            <Field label="Schedule"><select value={form.schedule_type} onChange={event => setForm({ ...form, schedule_type: event.target.value as CampaignForm['schedule_type'] })}><option value="immediate">Immediate after activation</option><option value="one_time">One time</option><option value="recurring">Recurring</option></select></Field>
            <Field label="Send time (Asia/Manila)"><input type="time" value={form.send_time} onChange={event => setForm({ ...form, send_time: event.target.value })} /></Field>
            <Field label="Start date"><input type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /></Field>
            <Field label="End date (optional)"><input type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /></Field>
            {form.schedule_type === 'recurring' && <Field label="Weekdays" wide><div className="flex flex-wrap gap-2">{weekdayOptions.map(([value, label]) => <button type="button" key={value} onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(value) ? form.weekdays.filter(day => day !== value) : [...form.weekdays, value] })} className={`min-h-10 rounded-lg border px-3 text-xs font-black ${form.weekdays.includes(value) ? 'border-primary bg-primary text-white' : 'border-slate-200'}`}>{label}</button>)}</div></Field>}
            <Field label="Repeat interval in minutes (optional)"><input type="number" min={5} value={form.repeat_interval_minutes} onChange={event => setForm({ ...form, repeat_interval_minutes: event.target.value })} /></Field>
            <Field label="Maximum sends per rider"><input type="number" min={1} max={20} value={form.max_sends_per_rider} onChange={event => setForm({ ...form, max_sends_per_rider: Number(event.target.value) })} /></Field>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button disabled={saving} onClick={() => void saveCampaign()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Save changes' : 'Create campaign'}</Button></div>
        </DialogContent></Dialog>
    
        <Dialog open={Boolean(testCampaign)} onOpenChange={open => { if (!open) setTestCampaign(null); }}><DialogContent><DialogHeader><DialogTitle>Send test notification</DialogTitle><DialogDescription>Select one rider device. This creates an inbox entry marked as a test.</DialogDescription></DialogHeader><Field label="Rider"><select value={testRiderId} onChange={event => setTestRiderId(event.target.value)}><option value="">Select a rider</option>{riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name} — {rider.email}</option>)}</select></Field><div className="flex justify-end"><Button disabled={!testRiderId || saving} onClick={() => void sendTest()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test</Button></div></DialogContent></Dialog>
      </div>;
    }
    
    function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
      return <label className={`space-y-1.5 text-xs font-black uppercase tracking-wide text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}><span>{label}</span><div className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:p-3 [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:font-medium [&_select]:font-medium [&_textarea]:font-medium [&_input]:normal-case [&_select]:normal-case [&_textarea]:normal-case">{children}</div></label>;
    }
    
    export default NotificationCampaigns;

## Activity

    file changes: Completed · 2 changes
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\__tests__\notificationCampaigns.test.ts
    import { describe, expect, it, vi } from 'vitest';
    import { ensureNotificationCampaignTables, newCampaignId } from '../notificationCampaigns';
    
    describe('notification campaign storage', () => {
      it('creates campaign, recipient, and delivery tables', async () => {
        const query = vi.fn().mockResolvedValue([[]]);
        await ensureNotificationCampaignTables({ query });
        const ddl = query.mock.calls.map(([sql]) => String(sql)).join('\n');
        expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaigns');
        expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaign_recipients');
        expect(ddl).toContain('CREATE TABLE IF NOT EXISTS notification_campaign_deliveries');
        expect(ddl).toContain('uq_campaign_delivery_idempotency');
      });
    
      it('generates namespaced campaign IDs', () => {
        expect(newCampaignId()).toMatch(/^campaign_[0-9a-f-]{36}$/);
      });
    });
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\src\app\pages\Admin\__tests__\admin-sidebar-order.test.tsx
    @@ -18,2 +18,3 @@
     vi.mock('../AdminMessaging', () => ({ AdminMessaging: () => null }));
    +vi.mock('../NotificationCampaigns', () => ({ NotificationCampaigns: () => null }));
     
    @@ -29,3 +30,3 @@
     
    -    expect(labels.slice(0, 7)).toEqual([
    +    expect(labels.slice(0, 8)).toEqual([
           'Dispatch Console',
    @@ -35,2 +36,3 @@
           'Attendance',
    +      'Notification Campaigns',
           'Analytics Hub',

## User

[1]   errno: 1005,
[1]   sql: 'CREATE TABLE IF NOT EXISTS notification_campaigns (\n' +
[1]     '    id VARCHAR(64) PRIMARY KEY,\n' +
[1]     '    name VARCHAR(120) NOT NULL,\n' +
[1]     '    notification_title VARCHAR(120) NOT NULL,\n' +
[1]     '    notification_body VARCHAR(500) NOT NULL,\n' +
[1]     "    status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',\n" +
[1]     "    target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,\n" +
[1]     "    schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',\n" +
[1]     '    start_date DATE NOT NULL,\n' +
[1]     '    end_date DATE NULL,\n' +
[1]     '    send_time TIME NOT NULL,\n' +
[1]     "    time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',\n" +
[1]     '    weekdays JSON NULL,\n' +
[1]     '    repeat_interval_minutes INT NULL,\n' +
[1]     '    max_sends_per_rider INT NOT NULL DEFAULT 1,\n' +
[1]     "    destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',\n" +
[1]     '    created_by VARCHAR(64) NOT NULL,\n' +
[1]     '    updated_by VARCHAR(64) NOT NULL,\n' +
[1]     '    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
[1]     '    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n' +
[1]     '    INDEX idx_campaign_status_start (status, start_date, send_time),\n' +
[1]     '    CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),\n' +
[1]     '    CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)\n' +
[1]     '  )',
[1]   sqlState: 'HY000',
[1]   sqlMessage: 'Can\'t create table `defaultdb_test`.`notification_campaigns` (errno: 150 "Foreign key constraint is incorrectly formed")'
[1] }

## Assistant

That startup error is from a foreign-key definition mismatch with the existing `users.id` column (usually length, charset, or collation). I’ll make the campaign startup migration compatible with this project’s existing runtime-table pattern by removing those nonessential FK constraints while retaining indexes and application-level validation; campaign-to-child cascade constraints can remain because their IDs are defined together.

## Activity

    $ rg -n "CREATE TABLE.*users|`users`|users \(" --glob '*.sql' --glob '*.ts' server database* . | Select-Object -First 120; rg -n "id VARCHAR|id CHAR|CREATE TABLE users" server -g '*.sql' -g '*.ts' | Select-Object -First 120
    rg: database*: The filename, directory name, or volume label syntax is incorrect. (os error 123)
    server\index.ts:21:import userRoutes from './routes/users';
    server\index.ts:199:          const [admins] = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
    server\index.ts:237:         LEFT JOIN users u ON u.id = dr.assigned_rider_id
    server\index.ts:546:app.use('/api/users', authenticate, idempotency, userRoutes);
    server\createTask.ts:6:    const [hrRows]: any = await pool.query('SELECT id FROM users WHERE email LIKE "%john.hr%" OR email LIKE "%john%" LIMIT 1');
    server\createTask.ts:15:    const [riderRows]: any = await pool.query('SELECT id, email FROM users WHERE role = "rider" LIMIT 1');
    server\locationTracking.ts:192:        "UPDATE users SET last_battery_level = ?, last_signal_strength = ?, updated_at = NOW() WHERE id = ?",
    server\locationTracking.ts:237:      "UPDATE users SET last_battery_level = ?, last_signal_strength = ?, updated_at = NOW() WHERE id = ?",
    server\locationTracking.ts:347:      "UPDATE users SET status = 'active', current_lat = ?, current_lng = ?, updated_at = ? WHERE id = ?",
    server\services\notificationCampaigns.ts:31:    CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    server\services\notificationCampaigns.ts:32:    CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    server\services\notificationCampaigns.ts:40:    CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    server\services\notificationCampaigns.ts:57:    CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    server\services\messaging.ts:24:  'users',
    server\services\messaging.ts:216:  JOIN users actor ON actor.id = cp.user_id
    server\services\messaging.ts:217:  JOIN users rider ON rider.id = c.rider_id
    server\services\messaging.ts:226:  LEFT JOIN users sender ON sender.id = lm.sender_id
    server\services\messaging.ts:253:    JOIN users actor ON actor.id = cp.user_id
    server\services\messaging.ts:282:    JOIN users participant ON participant.id = cp.user_id
    server\services\messaging.ts:307:      JOIN users actor ON actor.id = ?
    server\services\messaging.ts:372:    SELECT ?, id FROM users WHERE role = 'admin'
    server\services\messaging.ts:431:  JOIN users sender ON sender.id = m.sender_id
    server\services\messaging.ts:531:       JOIN users recipient ON recipient.id = cp.user_id
    server\services\deliveryNotifications.ts:58:  const [admins] = await executor.query('SELECT id FROM users WHERE role = ?', ['admin']) as any[];
    server\routes\auth.ts:34:  await pool.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [user.id]);
    server\routes\auth.ts:73:    'UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?',
    server\routes\auth.ts:92:    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    server\routes\auth.ts:93:    const users = rows as any[];
    server\routes\auth.ts:95:    if (users.length === 0) {
    server\routes\auth.ts:100:    const user = users[0];
    server\routes\auth.ts:167:      'SELECT * FROM users WHERE id = ? AND refresh_token = ? AND refresh_token_expires_at > NOW()',
    server\routes\auth.ts:170:    const users = rows as any[];
    server\routes\auth.ts:172:    if (users.length === 0) {
    server\routes\auth.ts:176:    const user = users[0];
    server\routes\auth.ts:214:          'UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ? AND refresh_token = ?',
    server\routes\auth.ts:223:        await pool.query('UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?', [userId]);
    server\routes\auth.ts:256:    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [pendingSetup.userId]);
    server\routes\auth.ts:290:      'SELECT * FROM users WHERE id = ? AND (mfa_enabled = 0 OR mfa_enabled IS NULL)',
    server\routes\auth.ts:309:        'UPDATE users SET mfa_secret = ?, mfa_enabled = 1 WHERE id = ? AND (mfa_enabled = 0 OR mfa_enabled IS NULL)',
    server\routes\auth.ts:341:    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [pendingLogin.userId]);
    server\routes\auth.ts:342:    const users = rows as any[];
    server\routes\auth.ts:343:    if (users.length === 0) return res.status(401).json({ error: 'Invalid or expired MFA login challenge' });
    server\routes\auth.ts:345:    const user = users[0];
    server\routes\auth.ts:387:      'INSERT INTO users (id, email, name, role, department, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    server\routes\auth.ts:391:    const [rows] = await pool.query('SELECT id, email, name, role, department FROM users WHERE id = ?', [id]);
    server\routes\auth.ts:410:      'SELECT id, email, role, require_password_reset FROM users WHERE id = ?',
    server\routes\auth.ts:430:      `UPDATE users SET password_hash = ?, require_password_reset = 0, last_password_change = CURRENT_TIMESTAMP,
    server\routes\analytics.ts:266:        NULLIF((SELECT COUNT(*) FROM users WHERE role = 'rider'), 0) * 100 as rate
    server\routes\analytics.ts:414:          LEFT JOIN users u ON u.id = sal.actor_id COLLATE utf8mb4_unicode_ci
    server\routes\analytics.ts:452:      FROM users u
    server\routes\analytics.ts:481:      JOIN users u ON me.rider_id COLLATE utf8mb4_unicode_ci = u.id
    server\routes\analytics.ts:493:      FROM users u
    server\routes\analytics.ts:507:      FROM users u
    server\scripts\2026-10-25-notification-campaigns.sql:22:  CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    server\scripts\2026-10-25-notification-campaigns.sql:23:  CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    server\scripts\2026-10-25-notification-campaigns.sql:32:  CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    server\scripts\2026-10-25-notification-campaigns.sql:50:  CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    server\routes\notificationCampaigns.ts:58:    JOIN users u ON u.id=cr.rider_id WHERE cr.campaign_id=? ORDER BY u.name`, [id]);
    server\routes\notificationCampaigns.ts:69:  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND status <> 'inactive' ORDER BY name");
    server\routes\notificationCampaigns.ts:88:    FROM notification_campaign_deliveries d JOIN users u ON u.id=d.rider_id
    server\routes\notificationCampaigns.ts:114:        SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
    server\routes\notificationCampaigns.ts:145:        SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
    server\routes\notificationCampaigns.ts:178:  const [riders]: any = await pool.query("SELECT id FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
    server\services\riderTaskQueue.ts:17:    const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ? AND role = \'rider\' FOR UPDATE', [riderId]);
    server\routes\requests.ts:54:    FROM users u
    server\routes\requests.ts:286:      LEFT JOIN users u ON u.id = dr.assigned_rider_id
    server\routes\requests.ts:525:        'SELECT name, department FROM users WHERE id = ? AND role = ? LIMIT 1',
    server\routes\requests.ts:763:      FROM users u
    server\routes\requests.ts:1126:      const [admins]: any = await pool.query('SELECT id FROM users WHERE role = "admin"');
    server\routes\requests.ts:1268:      const [adminRows]: any = await connection.query('SELECT id FROM users WHERE role = ?', ['admin']);
    server\routes\requests.ts:1356:            const [admins]: any = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
    server\routes\requests.ts:1470:      const [riderRows] = await conn.query('SELECT name FROM users WHERE id = ?', [riderId]) as any[];
    server\routes\notifications.ts:141:    const [rows] = await pool.query('SELECT fcm_token, expo_push_token, role FROM users WHERE id = ?', [userId]) as any[];
    server\routes\notifications.ts:168:          await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, fcmToken]);
    server\routes\notifications.ts:214:      ? 'UPDATE users SET fcm_token = ?, expo_push_token = NULL WHERE id = ?'
    server\routes\notifications.ts:215:      : 'UPDATE users SET expo_push_token = ? WHERE id = ?';
    server\routes\notifications.ts:234:    await pool.query(`UPDATE users SET ${clearTokens} WHERE id = ?`, [user.id]);
    server\routes\notifications.ts:267:    const [recipients] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [user_id]) as any[];
    server\services\proactiveOverdue.ts:32:  const adminsResult = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
    server\routes\riderTasks.ts:55:    const [userRows]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [user.id]);
    server\routes\riderTasks.ts:81:    const [userRows]: any = await pool.query('SELECT is_on_duty FROM users WHERE id = ?', [user.id]);
    server\services\webPushQueue.ts:138:     INNER JOIN users u ON n.user_id COLLATE utf8mb4_unicode_ci = u.id
    server\services\webPushQueue.ts:157:      INNER JOIN users u ON n.user_id COLLATE utf8mb4_unicode_ci = u.id
    server\services\__tests__\shiftSessions.test.ts:55:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]] : [[]]);
    server\services\__tests__\shiftSessions.test.ts:59:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]] : sql.includes('shift_operation_receipts') ? [[]] : sql.includes('SELECT * FROM shift_sessions WHERE rider_id')
    server\services\__tests__\shiftSessions.test.ts:69:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:81:    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = FALSE WHERE id = ?', ['rider-1']);
    server\services\__tests__\shiftSessions.test.ts:87:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:101:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:114:    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = FALSE WHERE id = ?', ['rider-1']);
    server\services\__tests__\shiftSessions.test.ts:120:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:135:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:147:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:160:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:175:    expect(conn.query).toHaveBeenCalledWith('UPDATE users SET is_on_duty = ? WHERE id = ?', [true, 'rider-1']);
    server\services\__tests__\shiftSessions.test.ts:180:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users')
    server\services\__tests__\shiftSessions.test.ts:195:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]]
    server\services\__tests__\shiftSessions.test.ts:203:    conn.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[{ id: 'rider-1' }]]
    server\services\shiftSessions.ts:46:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    server\services\shiftSessions.ts:73:    await conn.query('UPDATE users SET is_on_duty = ? WHERE id = ?', [input.isOnDuty, input.riderId]);
    server\services\shiftSessions.ts:92:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    server\services\shiftSessions.ts:111:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [input.riderId]);
    server\services\shiftSessions.ts:148:    const [riders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [riderId]);
    server\services\__tests__\shiftCutoff.test.ts:8:      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
    server\services\__tests__\shiftCutoff.test.ts:30:      if (sql.includes('SELECT id FROM users')) return [[{ id: 'rider-1' }]];
    server\services\__tests__\shiftCutoff.test.ts:44:      if (sql.includes("FROM users WHERE role = 'rider'")) return [[{ id: 'rider-1', name: 'Riley' }]];
    server\services\__tests__\riderTaskQueue.test.ts:14:    if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
    server\services\__tests__\riderTaskQueue.test.ts:36:    expect(sqlCalls.findIndex((sql) => sql.includes('SELECT id FROM users')))
    server\services\__tests__\riderTaskQueue.test.ts:53:      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
    server\services\__tests__\riderTaskQueue.test.ts:70:      if (sql.includes('SELECT id FROM users')) {
    server\services\__tests__\riderTaskQueue.test.ts:109:    missing.query.mockImplementation(async (sql: string) => sql.includes('SELECT id FROM users') ? [[]] : [[]]);
    server\services\__tests__\riderTaskQueue.test.ts:114:      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
    server\services\__tests__\riderTaskQueue.test.ts:129:      if (sql.includes('SELECT id FROM users')) return [[{ id: params[0] }]];
    server\services\shiftCutoff.ts:18:    const [riders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [riderId]);
    server\services\shiftCutoff.ts:37:    await conn.query('UPDATE users SET is_on_duty = FALSE WHERE id = ?', [riderId]);
    server\services\shiftCutoff.ts:78:  const [riders] = await db.query("SELECT id, name FROM users WHERE role = 'rider'");
    server\services\shiftCutoff.ts:86:      const [lockedRiders] = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [rider.id]);
    server\services\__tests__\proactiveOverduePush.test.ts:80:      if (sql.includes('SELECT id FROM users')) return [[{ id: 'admin-1' }], []];
    server\services\__tests__\messaging.test.ts:48:  it('derives Inbox rider avatar from identity without selecting users.avatar_id', async () => {
    server\services\__tests__\messaging.test.ts:121:    expect(targetSql).toContain('JOIN users participant ON participant.id = cp.user_id');
    server\scripts\2026-10-25-notification-campaigns.sql:2:  id VARCHAR(64) PRIMARY KEY,
    server\scripts\2026-10-25-notification-campaigns.sql:27:  campaign_id VARCHAR(64) NOT NULL,
    server\scripts\2026-10-25-notification-campaigns.sql:28:  rider_id VARCHAR(64) NOT NULL,
    server\scripts\2026-10-25-notification-campaigns.sql:36:  id VARCHAR(64) PRIMARY KEY,
    server\scripts\2026-10-25-notification-campaigns.sql:37:  campaign_id VARCHAR(64) NOT NULL,
    server\scripts\2026-10-25-notification-campaigns.sql:38:  rider_id VARCHAR(64) NOT NULL,
    server\scripts\2026-10-25-notification-campaigns.sql:42:  provider_message_id VARCHAR(255) NULL,
    server\scripts\2026-10-21-rider-status-operations.sql:2:  rider_id VARCHAR(191) NOT NULL,
    server\scripts\2026-10-21-rider-status-operations.sql:3:  operation_id VARCHAR(191) NOT NULL,
    server\scripts\2026-10-21-rider-status-operations.sql:4:  request_id VARCHAR(191) NOT NULL,
    server\services\locationEventReceipts.ts:9:      event_id VARCHAR(191) PRIMARY KEY,
    server\services\locationEventReceipts.ts:10:      session_id VARCHAR(191) NOT NULL,
    server\services\locationEventReceipts.ts:11:      request_id VARCHAR(191) NOT NULL,
    server\services\locationEventReceipts.ts:12:      rider_id VARCHAR(191) NOT NULL,
    server\services\authChallenges.ts:18:        user_id VARCHAR(191) NOT NULL,
    server\services\riderAvatarPreferences.ts:8:      user_id VARCHAR(191) NOT NULL PRIMARY KEY,
    server\services\riderAvatarPreferences.ts:9:      avatar_id VARCHAR(32) NOT NULL,
    server\services\notificationCampaigns.ts:11:    id VARCHAR(64) PRIMARY KEY,
    server\services\notificationCampaigns.ts:35:    campaign_id VARCHAR(64) NOT NULL,
    server\services\notificationCampaigns.ts:36:    rider_id VARCHAR(64) NOT NULL,
    server\services\notificationCampaigns.ts:43:    id VARCHAR(64) PRIMARY KEY,
    server\services\notificationCampaigns.ts:44:    campaign_id VARCHAR(64) NOT NULL,
    server\services\notificationCampaigns.ts:45:    rider_id VARCHAR(64) NOT NULL,
    server\services\notificationCampaigns.ts:49:    provider_message_id VARCHAR(255) NULL,
    server\services\messaging.ts:70:          id VARCHAR(191) NOT NULL PRIMARY KEY,
    server\services\messaging.ts:71:          request_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:72:          rider_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:84:          conversation_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:85:          user_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:94:          id VARCHAR(191) NOT NULL PRIMARY KEY,
    server\services\messaging.ts:95:          conversation_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:96:          sender_id VARCHAR(191) NOT NULL,
    server\services\messaging.ts:97:          client_message_id VARCHAR(191) NOT NULL,
    server\services\webPushQueue.ts:84:      notification_id VARCHAR(191) NOT NULL PRIMARY KEY,
    server\services\webPushQueue.ts:85:      user_id VARCHAR(191) NOT NULL,
    server\services\webPushQueue.ts:88:      request_id VARCHAR(191) NULL,
    server\services\webPushQueue.ts:99:      notification_id VARCHAR(191) NOT NULL,
    server\services\webPushQueue.ts:101:      user_id VARCHAR(191) NOT NULL,
    server\services\webPush.ts:33:      user_id VARCHAR(191) NOT NULL,
    server\services\shiftSchedule.ts:57:    actor_id VARCHAR(255) NOT NULL,
    server\routes\__tests__\rider-avatars.test.ts:163:      'ALTER TABLE users ADD COLUMN avatar_id VARCHAR(32) NULL',
    ✓ • 304ms

## Activity

    file changes: Completed · 2 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\scripts\2026-10-25-notification-campaigns.sql
    @@ -16,9 +16,7 @@
       destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
    -  created_by VARCHAR(64) NOT NULL,
    -  updated_by VARCHAR(64) NOT NULL,
    +  created_by VARCHAR(191) NOT NULL,
    +  updated_by VARCHAR(191) NOT NULL,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -  INDEX idx_campaign_status_start (status, start_date, send_time),
    -  CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    -  CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    +  INDEX idx_campaign_status_start (status, start_date, send_time)
     );
    @@ -27,7 +25,6 @@
       campaign_id VARCHAR(64) NOT NULL,
    -  rider_id VARCHAR(64) NOT NULL,
    +  rider_id VARCHAR(191) NOT NULL,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY (campaign_id, rider_id),
    -  CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    -  CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    +  CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
     );
    @@ -37,3 +34,3 @@
       campaign_id VARCHAR(64) NOT NULL,
    -  rider_id VARCHAR(64) NOT NULL,
    +  rider_id VARCHAR(191) NOT NULL,
       scheduled_at DATETIME NOT NULL,
    @@ -48,4 +45,3 @@
       INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
    -  CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    -  CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    +  CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
     );
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaigns.ts
    @@ -25,9 +25,7 @@
         destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
    -    created_by VARCHAR(64) NOT NULL,
    -    updated_by VARCHAR(64) NOT NULL,
    +    created_by VARCHAR(191) NOT NULL,
    +    updated_by VARCHAR(191) NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -    INDEX idx_campaign_status_start (status, start_date, send_time),
    -    CONSTRAINT fk_campaign_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    -    CONSTRAINT fk_campaign_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
    +    INDEX idx_campaign_status_start (status, start_date, send_time)
       )`);
    @@ -35,7 +33,6 @@
         campaign_id VARCHAR(64) NOT NULL,
    -    rider_id VARCHAR(64) NOT NULL,
    +    rider_id VARCHAR(191) NOT NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (campaign_id, rider_id),
    -    CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    -    CONSTRAINT fk_campaign_recipient_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    +    CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
       )`);
    @@ -44,3 +41,3 @@
         campaign_id VARCHAR(64) NOT NULL,
    -    rider_id VARCHAR(64) NOT NULL,
    +    rider_id VARCHAR(191) NOT NULL,
         scheduled_at DATETIME NOT NULL,
    @@ -55,4 +52,3 @@
         INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
    -    CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    -    CONSTRAINT fk_campaign_delivery_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
    +    CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
       )`);
    @@ -63,2 +59 @@
     }
    -

## Assistant

The foreign-key startup failure is corrected: rider/admin reference columns now match the repository’s established `VARCHAR(191)` convention, and cross-table user FKs were removed to avoid the legacy users-table collation mismatch. The campaign-to-child FKs remain safe because those new tables share the same definitions. I’m moving into type validation now.

## Activity

    $ npx tsc -p tsconfig.json --noEmit
    ✓ • 10.57s

## Activity

    $ npx tsc --noEmit
    src/app/pages/Admin/AnalyticsHub.tsx(14,1): error TS6133: 'OperationalIntegrityView' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(22,3): error TS6133: 'TrendingUp' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(37,3): error TS6133: 'ShieldAlert' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(150,27): error TS6133: 'setDiagnosticsOpen' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(151,28): error TS6133: 'setDiagnosticsRetry' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(152,10): error TS6133: 'diagnosticsLoad' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(153,31): error TS6133: 'setConnectivityFilters' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(174,10): error TS6133: 'integrityData' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(175,10): error TS6133: 'connectivityData' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(1117,10): error TS6133: 'RiderConnectivityView' is declared but its value is never read.
    src/app/pages/Admin/NotificationCampaigns.tsx(82,42): error TS2322: Type '"immediate" | "one_time" | "recurring"' is not assignable to type '"one_time"'.
      Type '"immediate"' is not assignable to type '"one_time"'.
    src/app/pages/Admin/NotificationCampaigns.tsx(164,10): error TS2367: This comparison appears to be unintentional because the types '"one_time"' and '"recurring"' have no overlap.
    ✗ (1) • 23.58s

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\src\app\pages\Admin\NotificationCampaigns.tsx
    @@ -29,4 +29,9 @@
     const philippineDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    -const emptyForm = () => ({
    -  name: '', notification_title: '', notification_body: '', target_type: 'all_riders', schedule_type: 'one_time' as const,
    +type CampaignForm = {
    +  name: string; notification_title: string; notification_body: string; target_type: string;
    +  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string; send_time: string;
    +  weekdays: number[]; repeat_interval_minutes: string; max_sends_per_rider: number; destination: string; rider_ids: string[];
    +};
    +const emptyForm = (): CampaignForm => ({
    +  name: '', notification_title: '', notification_body: '', target_type: 'all_riders', schedule_type: 'one_time',
       start_date: philippineDate(), end_date: '', send_time: '08:00', weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: '',
    @@ -34,3 +39,2 @@
     });
    -type CampaignForm = ReturnType<typeof emptyForm>;
     

## Activity

    $ npx vitest run server/services/__tests__/notificationCampaigns.test.ts src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    
     RUN  v4.1.9 C:/Users/63938/Desktop/Angel/production/rider-scheduling-system
    
    
     Test Files  2 passed (2)
          Tests  3 passed (3)
       Start at  20:05:26
       Duration  5.10s (transform 388ms, setup 0ms, import 1.98s, tests 229ms, environment 2.71s)
    
    ✓ • 6.93s

## Activity

    $ Get-Content server/middleware/idempotency.ts; npx tsc --noEmit 2>&1 | Select-String 'NotificationCampaigns|notificationCampaign'
    import { Response, NextFunction } from 'express';
    import { pool } from '../db';
    import { AuthRequest } from './auth';
    
    /**
     * Idempotency Middleware (Enterprise Hardening Slice 1.3)
     *
     * Ensures that requests with the same 'Idempotency-Key' are only processed once.
     * Subsequent requests with the same key will receive the cached response.
     *
     * Works for POST and PUT requests.
     */
    export const idempotency = async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (req.method === 'PUT' && req.user?.role === 'rider' && /^\/[^/]+\/status$/.test(req.path)) {
        return next();
      }
      const key = req.headers['idempotency-key'] as string;
    
      // Skip if no key or not a mutating method
      if (!key || (req.method !== 'POST' && req.method !== 'PUT')) {
        return next();
      }
    
      const userId = req.user?.id;
      if (!userId) {
        // If not authenticated yet, we can't reliably scope the key to a user.
        // However, usually idempotency runs after auth.
        return next();
      }
    
      try {
        // 1. Check for existing response
        const [rows]: any = await pool.query(
          'SELECT response_code, response_body FROM idempotency_keys WHERE idempotency_key = ? AND user_id = ? AND expires_at > NOW()',
          [key, userId]
        );
    
        if (rows && rows.length > 0) {
          console.log(`[IDEMPOTENCY] Cache hit for key: ${key}`);
          const { response_code, response_body } = rows[0];
          return res.status(response_code).json(response_body);
        }
    
        // 2. Intercept the response to cache it
        const originalJson = res.json;
        res.json = (body: any) => {
          // Only cache successful or client-error responses (not 500s usually)
          if (res.statusCode >= 200 && res.statusCode < 500) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours
    
            pool.query(
              'INSERT IGNORE INTO idempotency_keys (idempotency_key, user_id, response_code, response_body, expires_at) VALUES (?, ?, ?, ?, ?)',
              [key, userId, res.statusCode, JSON.stringify(body), expiresAt]
            ).catch(err => {
              console.error('[IDEMPOTENCY] Failed to cache response:', err);
            });
          }
    
          return originalJson.call(res, body);
        };
    
        next();
      } catch (err) {
        console.error('[IDEMPOTENCY] Middleware error:', err);
        next(); // Proceed anyway to avoid blocking the user
      }
    };
    ✗ (1) • 20.11s

## Activity

    $ Get-Content server/routes/__tests__/attendance-daily.test.ts -TotalCount 120; Get-Content server/routes/__tests__/notifications-security.test.ts -TotalCount 100
    import express from 'express';
    import cookieParser from 'cookie-parser';
    import request from 'supertest';
    import jwt from 'jsonwebtoken';
    import { beforeEach, describe, expect, it, vi } from 'vitest';
    
    const { poolQuery, getShiftSessionsForDate, approveLateCheckIn } = vi.hoisted(() => ({
      poolQuery: vi.fn(),
      getShiftSessionsForDate: vi.fn(),
      approveLateCheckIn: vi.fn(),
    }));
    vi.mock('../../db', () => ({ pool: { query: poolQuery, getConnection: vi.fn() } }));
    vi.mock('../../presence', () => ({ onlineRiders: new Map() }));
    vi.mock('../../locationTracking', () => ({ handleRiderLocationUpdate: vi.fn() }));
    vi.mock('../../services/connectivityLogger', () => ({ recordConnectivityLog: vi.fn() }));
    vi.mock('../../services/locationEventReceipts', () => ({ ensureLocationEventReceiptsTable: vi.fn() }));
    vi.mock('../../services/shiftSessions', () => ({
      approveLateCheckIn, endShiftSession: vi.fn(), getCurrentShiftSession: vi.fn(), getShiftSessionsForDate,
      setNonPresentAttendance: vi.fn(), ShiftSessionError: class ShiftSessionError extends Error {}, startShiftSession: vi.fn(),
    }));
    
    import { authenticate } from '../../middleware/auth';
    import { getJwtSecret } from '../../config/security';
    import usersRouter from '../users';
    
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/api/users', authenticate, usersRouter);
    const adminToken = `Bearer ${jwt.sign({ id: 'admin-1', role: 'admin' }, getJwtSecret())}`;
    const riderToken = `Bearer ${jwt.sign({ id: 'rider-1', role: 'rider' }, getJwtSecret())}`;
    
    describe('daily attendance API shift data', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        poolQuery.mockResolvedValue([[{
          rider_id: 'rider-1', rider_name: 'Riley', rider_email: 'riley@example.test',
          is_on_duty: 1,
          status: 'present', check_in_time: '2026-10-05 08:00:00', off_duty_time: null,
        }]]);
        getShiftSessionsForDate.mockResolvedValue({
          sessions: [{ id: 'shift-1', start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
          total_worked_minutes: 0,
        });
      });
    
      it('returns shift sessions for the requested Philippine work date', async () => {
        const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);
    
        expect(response.status).toBe(200);
        expect(getShiftSessionsForDate).toHaveBeenCalledWith(expect.anything(), 'rider-1', '2026-10-05');
        expect(response.body[0]).toMatchObject({
          rider_id: 'rider-1', is_on_duty: true, total_worked_minutes: 0,
          sessions: [{ start_time: '2026-10-05 08:00:00', end_time: null, session_state: 'open' }],
        });
      });
    
      it('includes automatic absence and administrator approval metadata', async () => {
        poolQuery.mockResolvedValueOnce([[{
          rider_id: 'rider-1', rider_name: 'Riley', rider_email: 'riley@example.test', is_on_duty: 0,
          status: 'absent', absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
          late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-05 08:20:00',
          late_checkin_approved_by_name: 'Admin',
        }]]);
    
        const response = await request(app).get('/api/users/attendance/daily?date=2026-10-05').set('Authorization', adminToken);
    
        expect(response.status).toBe(200);
        expect(response.body[0]).toMatchObject({
          absence_source: 'automatic_no_show', auto_absent_at: '2026-10-05 08:15:00',
          late_checkin_approved_by: 'admin-1', late_checkin_approved_by_name: 'Admin',
        });
      });
    
      it('lets only admins approve a late check-in and emits confirmed attendance updates', async () => {
        const emit = vi.fn();
        app.set('io', { to: vi.fn(() => ({ emit })) });
        approveLateCheckIn.mockResolvedValue({ late_checkin_approved_by: 'admin-1', late_checkin_approved_at: '2026-10-22 08:20:00' });
    
        const unauthenticated = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval').send({ date: '2026-10-22' });
        const forbidden = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
          .set('Authorization', riderToken).send({ date: '2026-10-22' });
        const response = await request(app).post('/api/users/attendance/rider-1/late-check-in-approval')
          .set('Authorization', adminToken).send({ date: '2026-10-22' });
    
        expect(unauthenticated.status).toBe(401);
        expect(forbidden.status).toBe(403);
        expect(approveLateCheckIn).toHaveBeenCalledWith(expect.anything(), { riderId: 'rider-1', date: '2026-10-22', adminId: 'admin-1' });
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ success: true, late_checkin_approved_by: 'admin-1' });
        expect(emit).toHaveBeenCalledWith('attendance-updated', { status: 'absent', late_checkin_approved: true, date: '2026-10-22' });
      });
    
      it('does not let admins clear an automatic no-show in place of explicit approval', async () => {
        poolQuery.mockResolvedValueOnce([[{ absence_source: 'automatic_no_show' }]]);
    
        const response = await request(app).delete('/api/users/attendance/rider-1').set('Authorization', adminToken);
    
        expect(response.status).toBe(409);
        expect(poolQuery).toHaveBeenCalledTimes(1);
      });
    });
    import { beforeEach, describe, expect, it, vi } from 'vitest';
    import express from 'express';
    import request from 'supertest';
    
    const { query, pushSend, sendFcm } = vi.hoisted(() => ({ query: vi.fn(), pushSend: vi.fn(), sendFcm: vi.fn() }));
    vi.mock('../../db', () => ({ pool: { query } }));
    vi.mock('../../services/fcm', () => ({
      sendFcmNotification: sendFcm,
      isPermanentFcmTokenError: (error: any) => [
        'messaging/registration-token-not-registered', 'messaging/invalid-registration-token',
      ].includes(error?.code),
    }));
    vi.mock('expo-server-sdk', () => ({
      Expo: class {
        static isExpoPushToken(token: string) { return token.startsWith('ExpoPushToken['); }
        chunkPushNotifications(messages: unknown[]) { return [messages]; }
        async sendPushNotificationsAsync(...args: any[]) { return pushSend(...args); }
      },
    }));
    
    import notificationRoutes from '../notifications';
    
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { id: 'actor-1', role: req.headers['x-role'] || 'rider' };
      next();
    });
    app.use('/api/notifications', notificationRoutes);
    
    describe('notification creation authorization', () => {
      beforeEach(() => {
        query.mockReset().mockResolvedValue([[], []]);
        pushSend.mockReset().mockResolvedValue([]);
        sendFcm.mockReset().mockResolvedValue(undefined);
      });
    
      it('rejects cross-user notification creation by ordinary accounts before database access', async () => {
        const response = await request(app).post('/api/notifications').send({
          user_id: 'victim', message: 'hello', type: 'info',
        });
        expect(response.status).toBe(403);
        expect(query).not.toHaveBeenCalled();
      });
    
      it('rejects malformed admin notification payloads before database access', async () => {
        const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
          user_id: 'victim', message: 'x'.repeat(501), type: 'made_up',
        });
        expect(response.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
      });
    
      it('requires a real recipient for admin notification creation', async () => {
        const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
          user_id: 'missing', message: 'hello', type: 'info',
        });
        expect(response.status).toBe(404);
        expect(query).toHaveBeenCalledOnce();
        expect(String(query.mock.calls[0][0])).toContain('SELECT id FROM users');
      });
    
      it('allows admins to create a valid notification for an existing user', async () => {
        query.mockResolvedValueOnce([[{ id: 'rider-1' }], []])
          .mockResolvedValueOnce([{ affectedRows: 1 }, []])
          .mockResolvedValueOnce([[{ expo_push_token: null }], []]);
        const response = await request(app).post('/api/notifications').set('x-role', 'admin').send({
          user_id: 'rider-1', message: 'New task', type: 'new_assignment', request_id: 'request-1',
        });
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(query).toHaveBeenCalledTimes(3);
      });
    
      it('does not send Expo push to personnel even if they have a push token', async () => {
        query.mockResolvedValueOnce([[{ expo_push_token: 'valid-token', role: 'personnel' }], []]);
        await (await import('../notifications')).sendPushNotification('personnel-1', 'Update', 'Request update');
        expect(pushSend).not.toHaveBeenCalled();
        expect(sendFcm).not.toHaveBeenCalled();
      });
    
      it('registers an FCM token only for the authenticated rider', async () => {
        const response = await request(app).post('/api/notifications/register-token').send({
          token: 'fcm-registration-token', provider: 'fcm', platform: 'android',
        });
    
        expect(response.status).toBe(200);
        expect(String(query.mock.calls[0][0])).toContain('fcm_token');
        expect(String(query.mock.calls[0][0])).toContain('expo_push_token = NULL');
        expect(query.mock.calls[0][1]).toEqual(['fcm-registration-token', 'actor-1']);
      });
    
      it('rejects FCM token registration for non-rider accounts', async () => {
        const response = await request(app).post('/api/notifications/register-token')
          .set('x-role', 'personnel')
          .send({ token: 'fcm-registration-token', provider: 'fcm', platform: 'android' });
    
        expect(response.status).toBe(403);
        expect(query).not.toHaveBeenCalled();
      });
    ✓ • 119ms

## Activity

    file changes: Completed · 2 changes
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\__tests__\notification-campaigns.test.ts
    import { beforeEach, describe, expect, it, vi } from 'vitest';
    import express from 'express';
    import request from 'supertest';
    
    const { query, getConnection, logAction, sendPushNotification } = vi.hoisted(() => ({
      query: vi.fn(), getConnection: vi.fn(), logAction: vi.fn(), sendPushNotification: vi.fn(),
    }));
    vi.mock('../../db', () => ({ pool: { query, getConnection } }));
    vi.mock('../../services/auditLogger', () => ({ logAction }));
    vi.mock('../notifications', () => ({ sendPushNotification }));
    
    import notificationCampaignRoutes from '../notificationCampaigns';
    
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { id: 'admin-1', role: req.headers['x-role'] || 'admin' };
      next();
    });
    app.use('/api/notification-campaigns', notificationCampaignRoutes);
    
    describe('notification campaign routes', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        query.mockResolvedValue([[]]);
      });
    
      it('allows only administrators to access campaigns', async () => {
        const response = await request(app).get('/api/notification-campaigns').set('x-role', 'rider');
        expect(response.status).toBe(403);
        expect(query).not.toHaveBeenCalled();
      });
    
      it('rejects an invalid recurring campaign before opening a transaction', async () => {
        const response = await request(app).post('/api/notification-campaigns').send({
          name: 'Morning reminder', notification_title: 'Start shift', notification_body: 'Please start your shift.',
          target_type: 'all_riders', schedule_type: 'recurring', start_date: '2026-10-25', end_date: null,
          send_time: '08:00', weekdays: [], repeat_interval_minutes: 10, max_sends_per_rider: 3,
          destination: 'shift', rider_ids: [],
        });
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('weekday');
        expect(getConnection).not.toHaveBeenCalled();
      });
    
      it('returns campaign summaries with normalized counts and weekdays', async () => {
        query.mockResolvedValueOnce([[{
          id: 'campaign-1', name: 'Morning', status: 'draft', weekdays: '[1,2,3,4,5]',
          recipient_count: '2', delivery_count: '0',
        }]]);
        const response = await request(app).get('/api/notification-campaigns');
        expect(response.status).toBe(200);
        expect(response.body[0]).toMatchObject({ weekdays: [1, 2, 3, 4, 5], recipient_count: 2, delivery_count: 0 });
      });
    });
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    @@ -198,3 +198,4 @@
         const updated = await getCampaign(id);
    -    await audit(req, `notification_campaign_${action}d`, id, { status: previous.status }, { status: transition.to });
    +    const auditAction = action === 'cancel' ? 'notification_campaign_cancelled' : `notification_campaign_${action}d`;
    +    await audit(req, auditAction, id, { status: previous.status }, { status: transition.to });
         res.json(updated);

## Activity

    $ npx vitest run server/services/__tests__/notificationCampaigns.test.ts server/routes/__tests__/notification-campaigns.test.ts src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    
     RUN  v4.1.9 C:/Users/63938/Desktop/Angel/production/rider-scheduling-system
    
    
     Test Files  3 passed (3)
          Tests  6 passed (6)
       Start at  20:06:11
       Duration  5.01s (transform 636ms, setup 0ms, import 3.10s, tests 385ms, environment 2.35s)
    
    ✓ • 7.15s

## Activity

    $ npx tsc -p tsconfig.json --noEmit
    ✓ • 8.56s

## Assistant

Phase 1’s focused checks now pass: the backend compiles, campaign storage/API tests pass, and the admin navigation test passes. I’m running the requested broader test suite next; the frontend typecheck currently has unrelated pre-existing unused-code errors in `AnalyticsHub.tsx`, while the new campaign page itself is type-clean.

## Activity

    $ npx vitest run
    
     RUN  v4.1.9 C:/Users/63938/Desktop/Angel/production/rider-scheduling-system
    
     ❯ src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx (4 tests | 1 failed) 1592ms
       × labels automatic no-shows and lets admins approve a late check-in 901ms
    
    ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
    
     FAIL  src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx > labels automatic no-shows and lets admins approve a late check-in
    AssertionError: expected { date: '2026-10-25' } to deeply equal { date: '2026-10-22' }
    
    - Expected
    + Received
    
      {
    -   "date": "2026-10-22",
    +   "date": "2026-10-25",
      }
    
     ❯ src/app/pages/Admin/__tests__/attendance-auto-absence.test.tsx:50:55
         48|   await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
         49|   expect(fetchMock.mock.calls[1][0]).toContain('/api/users/attendance/…
         50|   expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ date: …
           |                                                       ^
         51|   expect(toastSuccess).toHaveBeenCalledWith('Late check-in approved fo…
         52|   expect(await screen.findAllByText(/Late check-in approved by Admin a…
    
    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
    
    
     Test Files  1 failed | 95 passed (96)
          Tests  1 failed | 512 passed (513)
       Start at  20:06:22
       Duration  41.39s (transform 8.14s, setup 0ms, import 84.78s, tests 34.82s, environment 105.95s)
    
    ✗ (1) • 43.12s

## Assistant

The full suite completed with 512/513 tests passing. The only failure is an existing date-sensitive attendance test expecting October 22 while the test environment is October 25; it is unrelated to campaigns. I’m leaving that attendance behavior untouched and updating the project knowledge graph now, as required after code changes.

## Activity

    $ graphify update .
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    [graphify] WARNING: could not scan C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\.expo\web\cache\production\images\android-standard-round-background\android-standard-round-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent ([WinError 3] The system cannot find the path specified: 'C:\\Users\\63938\\Desktop\\Angel\\production\\rider-scheduling-system\\mobile-app\\.expo\\web\\cache\\production\\images\\android-standard-round-background\\android-standard-round-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent'); its files are missing from this run's enumeration.
    [graphify] WARNING: could not scan C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\.expo\web\cache\production\images\android-standard-square-background\android-standard-square-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent ([WinError 3] The system cannot find the path specified: 'C:\\Users\\63938\\Desktop\\Angel\\production\\rider-scheduling-system\\mobile-app\\.expo\\web\\cache\\production\\images\\android-standard-square-background\\android-standard-square-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent'); its files are missing from this run's enumeration.
    Re-extracting code files in . (no LLM needed)...
      AST extraction: 100/696 uncached files (14%) [8 workers]
      AST extraction: 200/696 uncached files (28%) [8 workers]
      AST extraction: 300/696 uncached files (43%) [8 workers]
      AST extraction: 400/696 uncached files (57%) [8 workers]
      AST extraction: 500/696 uncached files (71%) [8 workers]
      AST extraction: 600/696 uncached files (86%) [8 workers]
      AST extraction: 696/696 uncached files (100%) [8 workers]
      warning: 27 source file(s) produced zero nodes and are absent from the graph: hooks.json, settings.json, .graphify_ast.json, .graphify_detect.json, admin-lint-results.json (+22 more). A re-run will retry them (empties are no longer cached); if it persists, please report the file(s) (#1666).
      warning: 3 .sql file(s) contributed nothing to the graph because a dependency is missing: tree_sitter_sql not installed. Install it with: pip install "graphifyy[sql]" (#1745)
    [graphify] backed up curated graph (5 files) -> 2026-10-25/
    [graphify watch] Skipped graph.html: Graph has 9345 nodes - too large for HTML viz (limit: 5000). Use --no-viz, raise GRAPHIFY_VIZ_NODE_LIMIT, or reduce input size.
    [graphify watch] Rebuilt: 9345 nodes, 18672 edges, 514 communities
    [graphify watch] graph.json and GRAPH_REPORT.md updated in graphify-out
    Code graph updated. For doc/paper/image changes run /graphify --update in your AI assistant.
    Tip: set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini for semantic extraction.
    ✓ • 1m 07s

## Activity

    $ git diff -- server/index.ts server/routes/notificationCampaigns.ts server/services/notificationCampaigns.ts server/scripts/2026-10-25-notification-campaigns.sql src/app/pages/Admin/AdminLayout.tsx src/app/pages/Admin/NotificationCampaigns.tsx src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx server/routes/__tests__/notification-campaigns.test.ts server/services/__tests__/notificationCampaigns.test.ts; git status --short -- server/index.ts server/routes/notificationCampaigns.ts server/services/notificationCampaigns.ts server/scripts/2026-10-25-notification-campaigns.sql src/app/pages/Admin/AdminLayout.tsx src/app/pages/Admin/NotificationCampaigns.tsx src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx server/routes/__tests__/notification-campaigns.test.ts server/services/__tests__/notificationCampaigns.test.ts
    warning: in the working copy of 'server/index.ts', LF will be replaced by CRLF the next time Git touches it
    warning: in the working copy of 'src/app/pages/Admin/AdminLayout.tsx', LF will be replaced by CRLF the next time Git touches it
    warning: in the working copy of 'src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx', LF will be replaced by CRLF the next time Git touches it
    diff --git a/server/index.ts b/server/index.ts
    index d8a021f..4fab444 100644
    --- a/server/index.ts
    +++ b/server/index.ts
    @@ -16,12 +16,15 @@ import authRoutes from './routes/auth';
     import requestRoutes from './routes/requests';
     import riderTaskRoutes from './routes/riderTasks';
     import notificationRoutes from './routes/notifications';
    +import notificationCampaignRoutes from './routes/notificationCampaigns';
     import conversationRoutes, { resolveRequestConversation } from './routes/conversations';
     import userRoutes from './routes/users';
    +import shiftScheduleRoutes from './routes/shiftSchedule';
     import analyticsRoutes from './routes/analytics';
     import routingRoutes from './routes/routing';
     import { pool } from './db';
     import { authenticate } from './middleware/auth';
    +import { requireRiderWorkAccess } from './middleware/riderShiftAccess';
     import { idempotency } from './middleware/idempotency';
     import { onlineRiders, updateRiderPresence, removeRiderPresence, cleanupOfflineRiders } from './presence';
     import { handleRiderLocationUpdate, pruneTrackingState, riderLatestState } from './locationTracking';
    @@ -33,6 +36,9 @@ import { ensureMessagingTables } from './services/messaging';
     import { canAccessConversation } from './services/messaging';
     import { ensureAuthChallengesTable } from './services/authChallenges';
     import { startProactiveOverdueWorker } from './services/proactiveOverdue';
    +import { ensureShiftScheduleTables } from './services/shiftSchedule';
    +import { startShiftCutoffWorker } from './services/shiftCutoff';
    +import { ensureNotificationCampaignTables } from './services/notificationCampaigns';
     import { getJwtSecret, validateProductionSecurityConfig } from './config/security';
    
     validateProductionSecurityConfig();
    @@ -538,9 +544,11 @@ app.use('/api/auth', authRoutes);
     app.use('/api/conversations', authenticate, idempotency, conversationRoutes);
     app.get('/api/requests/:id/conversation', authenticate, idempotency, resolveRequestConversation);
     app.use('/api/users', authenticate, idempotency, userRoutes);
    -app.use('/api/requests', authenticate, idempotency, requestRoutes);
    +app.use('/api/shift-schedule', authenticate, shiftScheduleRoutes);
    +app.use('/api/requests', authenticate, idempotency, requireRiderWorkAccess, requestRoutes);
     app.use('/api/rider/tasks', authenticate, idempotency, riderTaskRoutes);
     app.use('/api/notifications', authenticate, idempotency, notificationRoutes);
    +app.use('/api/notification-campaigns', authenticate, idempotency, notificationCampaignRoutes);
     app.use('/api/analytics', authenticate, idempotency, analyticsRoutes);
     app.use('/api/routing', authenticate, routingRoutes);
    
    @@ -557,6 +565,9 @@ ensureMessagingTables()
     ensureAuthChallengesTable()
       .catch((error) => console.error('[AUTH CHALLENGES] Startup initialization failed:', error));
    
    +ensureNotificationCampaignTables(pool)
    +  .catch((error) => console.error('[NOTIFICATION CAMPAIGNS] Startup initialization failed:', error));
    +
     const clientDistPath = path.resolve(__dirname, '..', '..', 'dist');
     const clientIndexPath = path.join(clientDistPath, 'index.html');
    
    @@ -572,6 +583,9 @@ if (fs.existsSync(clientIndexPath)) {
     const watchdog = new RequestWatchdog(io);
     watchdog.start();
     startProactiveOverdueWorker(io);
    +ensureShiftScheduleTables()
    +  .then(() => startShiftCutoffWorker(pool, io))
    +  .catch((error) => console.error('[SHIFT HOURS] Startup initialization failed:', error));
    
     if (bugsnagMiddleware) {
       app.use(bugsnagMiddleware.errorHandler);
    diff --git a/src/app/pages/Admin/AdminLayout.tsx b/src/app/pages/Admin/AdminLayout.tsx
    index 246a384..24ec39a 100644
    --- a/src/app/pages/Admin/AdminLayout.tsx
    +++ b/src/app/pages/Admin/AdminLayout.tsx
    @@ -9,7 +9,7 @@ import { cn } from '../../components/ui/utils';
     import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../../components/ui/sheet';
     import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
     import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
    -import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare } from 'lucide-react';
    +import { Truck, Users, BarChart3, LogOut, UserCog, Mail, Shield, Menu, Palette, Calendar, MapPin, ClipboardCheck, Loader2, MessageSquare, Clock3, BellRing } from 'lucide-react';
     import { NotificationBell } from '../../components/Admin/NotificationBell';
     import { FloatingRiderMessagePreview } from '../../components/Admin/FloatingRiderMessagePreview';
     import { useRealTime } from '../../context/RealTimeContext';
    @@ -25,8 +25,10 @@ const CalendarView = lazy(() => import('./CalendarView').then(module => ({ defau
     const RiderMap = lazy(() => import('./RiderMap').then(module => ({ default: module.RiderMap })));
     const AttendanceDashboard = lazy(() => import('./AttendanceDashboard').then(module => ({ default: module.AttendanceDashboard })));
     const AdminMessaging = lazy(() => import('./AdminMessaging').then(module => ({ default: module.AdminMessaging })));
    +const ShiftHours = lazy(() => import('./ShiftHours').then(module => ({ default: module.ShiftHours })));
    +const NotificationCampaigns = lazy(() => import('./NotificationCampaigns').then(module => ({ default: module.NotificationCampaigns })));
    
    -type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'calendar' | 'rider-map' | 'attendance';
    +type AdminView = 'dispatch' | 'messages' | 'users' | 'analytics' | 'theme' | 'shift-hours' | 'calendar' | 'rider-map' | 'attendance' | 'campaigns';
    
     const ADMIN_MAIN_NAVIGATION = [
       { view: 'dispatch', label: 'Dispatch Console', icon: Truck },
    @@ -34,6 +36,7 @@ const ADMIN_MAIN_NAVIGATION = [
       { view: 'rider-map', label: 'Rider Map', icon: MapPin },
       { view: 'messages', label: 'Inbox', icon: MessageSquare },
       { view: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    +  { view: 'campaigns', label: 'Notification Campaigns', icon: BellRing },
       { view: 'analytics', label: 'Analytics Hub', icon: BarChart3 },
       { view: 'users', label: 'User Management', icon: Users },
     ] as const;
    @@ -112,6 +115,9 @@ export function AdminLayout() {
               ))}
    
               <p className="px-3 text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 mt-4">Settings</p>
    +          <button onClick={() => setCurrentView('shift-hours')} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all ${currentView === 'shift-hours' ? 'bg-primary text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    +            <Clock3 size={14} /><span className="text-[11px]">Shift Hours</span>
    +          </button>
    
               <button
                 onClick={() => setCurrentView('theme')}
    @@ -197,6 +203,7 @@ export function AdminLayout() {
                           ))}
    
                           <p className="px-2 text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2 mt-4">Settings</p>
    +                      <SheetTrigger asChild><button onClick={() => setCurrentView('shift-hours')} className={`min-h-11 w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold transition-all ${currentView === 'shift-hours' ? 'bg-primary text-white' : 'text-slate-400'}`}><Clock3 size={14} /><span className="text-xs">Shift Hours</span></button></SheetTrigger>
    
                           <SheetTrigger asChild>
                             <button
    @@ -211,7 +218,7 @@ export function AdminLayout() {
                       </SheetContent>
                     </Sheet>
                     <h1 className="min-w-0 truncate font-black text-slate-900 text-xs md:hidden uppercase tracking-widest">
    -                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
    +                  {currentView === 'rider-map' ? 'Rider Map' : currentView === 'calendar' ? 'Calendar View' : currentView === 'messages' ? 'Inbox' : currentView === 'users' ? 'User Management' : currentView === 'analytics' ? 'Analytics Hub' : currentView === 'attendance' ? 'Attendance' : currentView === 'campaigns' ? 'Notification Campaigns' : currentView === 'shift-hours' ? 'Shift Hours' : currentView === 'theme' ? 'Theme Selection' : 'Dispatch Console'}
                     </h1>
                   </div>
    
    @@ -272,8 +279,10 @@ export function AdminLayout() {
                 {currentView === 'users' && <UserManagement />}
                 {currentView === 'analytics' && <AnalyticsHub />}
                 {currentView === 'theme' && <ThemeSelection />}
    +            {currentView === 'shift-hours' && <ShiftHours onOpenAttendance={() => setCurrentView('attendance')} />}
                 {currentView === 'rider-map' && <RiderMap />}
                 {currentView === 'attendance' && <AttendanceDashboard />}
    +            {currentView === 'campaigns' && <NotificationCampaigns />}
                 {currentView === 'messages' && <AdminMessaging
                   initialConversationId={pendingConversationId}
                   onInitialConversationOpened={() => setPendingConversationId(null)}
    diff --git a/src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx b/src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    index d4b3fad..c29d21d 100644
    --- a/src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    +++ b/src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    @@ -16,6 +16,7 @@ vi.mock('../CalendarView', () => ({ CalendarView: () => null }));
     vi.mock('../RiderMap', () => ({ RiderMap: () => null }));
     vi.mock('../AttendanceDashboard', () => ({ AttendanceDashboard: () => null }));
     vi.mock('../AdminMessaging', () => ({ AdminMessaging: () => null }));
    +vi.mock('../NotificationCampaigns', () => ({ NotificationCampaigns: () => null }));
    
     import { AdminLayout } from '../AdminLayout';
    
    @@ -27,12 +28,13 @@ describe('admin sidebar navigation order', () => {
         expect(mainMenu).not.toBeNull();
         const labels = within(mainMenu!).getAllByRole('button').map(button => button.textContent?.trim());
    
    -    expect(labels.slice(0, 7)).toEqual([
    +    expect(labels.slice(0, 8)).toEqual([
           'Dispatch Console',
           'Calendar View',
           'Rider Map',
           'Inbox',
           'Attendance',
    +      'Notification Campaigns',
           'Analytics Hub',
           'User Management',
         ]);
     M server/index.ts
     M src/app/pages/Admin/AdminLayout.tsx
     M src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    ?? server/routes/__tests__/notification-campaigns.test.ts
    ?? server/routes/notificationCampaigns.ts
    ?? server/scripts/2026-10-25-notification-campaigns.sql
    ?? server/services/__tests__/notificationCampaigns.test.ts
    ?? server/services/notificationCampaigns.ts
    ?? src/app/pages/Admin/NotificationCampaigns.tsx
    ✓ • 155ms

## Activity

    $ npx tsx -e "import { pool } from './server/db.ts'; import { ensureNotificationCampaignTables } from './server/services/notificationCampaigns.ts'; ensureNotificationCampaignTables(pool).then(async()=>{ console.log('campaign tables ready'); await pool.end(); }).catch(async(error)=>{ console.error(error); await pool.end(); process.exit(1); });"
    [dotenv@17.3.1] injecting env (13) from server\.env -- tip: 🤖 agentic secret storage: https://dotenvx.com/as2
    ✅ DB Connected: defaultdb_test on port
    3306
    campaign tables ready
    ✓ • 2.52s

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    @@ -177,4 +177,5 @@
       if (!riderId.success) return res.status(400).json({ error: 'Select a rider for the test notification' });
    -  const [riders]: any = await pool.query("SELECT id FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
    +  const [riders]: any = await pool.query("SELECT id, fcm_token, expo_push_token FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
       if (!riders[0]) return res.status(404).json({ error: 'Rider not found' });
    +  if (!riders[0].fcm_token && !riders[0].expo_push_token) return res.status(409).json({ error: 'The selected rider has no registered push device' });
       const notificationId = `notif_${crypto.randomUUID()}`;

## Activity

    $ npx vitest run server/services/__tests__/notificationCampaigns.test.ts server/routes/__tests__/notification-campaigns.test.ts src/app/pages/Admin/__tests__/admin-sidebar-order.test.tsx
    
     RUN  v4.1.9 C:/Users/63938/Desktop/Angel/production/rider-scheduling-system
    
    
     Test Files  3 passed (3)
          Tests  6 passed (6)
       Start at  20:08:37
       Duration  5.93s (transform 665ms, setup 0ms, import 3.41s, tests 391ms, environment 2.84s)
    
    ✓ • 8.23s

## Activity

    $ npx tsc -p tsconfig.json --noEmit
    ✓ • 9.15s

## Activity

    $ graphify update . --no-viz
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    error: unknown update option: --no-viz
    ✗ (1) • 213ms

## Assistant

The database initializer now runs successfully against `defaultdb_test` (“campaign tables ready”), confirming the foreign-key issue is resolved. I also tightened test-send so admins get a clear error when the chosen rider has no registered push device. The final focused checks remain green; I’m refreshing Graphify once more after that last code change.

## Activity

    $ graphify update .
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    [graphify] WARNING: could not scan C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\.expo\web\cache\production\images\android-standard-round-background\android-standard-round-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent ([WinError 3] The system cannot find the path specified: 'C:\\Users\\63938\\Desktop\\Angel\\production\\rider-scheduling-system\\mobile-app\\.expo\\web\\cache\\production\\images\\android-standard-round-background\\android-standard-round-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent'); its files are missing from this run's enumeration.
    [graphify] WARNING: could not scan C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\.expo\web\cache\production\images\android-standard-square-background\android-standard-square-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent ([WinError 3] The system cannot find the path specified: 'C:\\Users\\63938\\Desktop\\Angel\\production\\rider-scheduling-system\\mobile-app\\.expo\\web\\cache\\production\\images\\android-standard-square-background\\android-standard-square-background-fb139c2dee362ebf2070e23b96da6fc0d43f8492de38b8af1fd7223e19b5861d-cover-transparent'); its files are missing from this run's enumeration.
    Re-extracting code files in . (no LLM needed)...
      AST extraction: 100/696 uncached files (14%) [8 workers]
      AST extraction: 200/696 uncached files (28%) [8 workers]
      AST extraction: 300/696 uncached files (43%) [8 workers]
      AST extraction: 400/696 uncached files (57%) [8 workers]
      AST extraction: 500/696 uncached files (71%) [8 workers]
      AST extraction: 600/696 uncached files (86%) [8 workers]
      AST extraction: 696/696 uncached files (100%) [8 workers]
      warning: 27 source file(s) produced zero nodes and are absent from the graph: hooks.json, settings.json, .graphify_ast.json, .graphify_detect.json, admin-lint-results.json (+22 more). A re-run will retry them (empties are no longer cached); if it persists, please report the file(s) (#1666).
      warning: 3 .sql file(s) contributed nothing to the graph because a dependency is missing: tree_sitter_sql not installed. Install it with: pip install "graphifyy[sql]" (#1745)
    [graphify watch] No code-graph topology changes detected; outputs left untouched.
    Code graph updated. For doc/paper/image changes run /graphify --update in your AI assistant.
    Tip: set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini for semantic extraction.
    ✓ • 53.74s

## Assistant

Phase 1 is implemented.

Included:

- Admin **Notification Campaigns** page
- Create, edit, activate, pause, resume, cancel, and duplicate campaigns
- Test notification to a selected rider
- Recipient groups, schedules, weekdays, repeat settings, limits, and destinations
- Admin-only campaign APIs
- Campaign, recipient, and delivery-history database tables
- Audit logging
- Database startup initialization
- Fixed the reported foreign-key creation error

Key files:

- [NotificationCampaigns.tsx](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/src/app/pages/Admin/NotificationCampaigns.tsx)
- [notificationCampaigns.ts](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/routes/notificationCampaigns.ts)
- [notificationCampaigns service](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/services/notificationCampaigns.ts)
- [database migration](C:/Users/63938/Desktop/Angel/production/rider-scheduling-system/server/scripts/2026-10-25-notification-campaigns.sql)

Validation:

- Backend typecheck: passed
- Campaign-focused tests: 6 passed
- Database initialization: passed
- Full tests: 512 passed, 1 unrelated date-sensitive attendance test failed
- Frontend typecheck: campaign code is clean; existing unused-code errors remain in `AnalyticsHub.tsx`
- Graphify update: passed

Automatic scheduled sending is intentionally reserved for Phase 2.

## User

do the phase 2 and 3. then shorten the testing.

## Assistant

I’ll implement Phases 2 and 3 on top of the completed campaign foundation: scheduler/targeting/delivery first, then reporting and production safeguards. I’ll keep validation short as requested—focused typechecks and campaign tests—while still updating Graphify afterward.

## Activity

    $ Get-Content -Raw '.agents/skills/quality-gate/SKILL.md'; graphify query "notification campaigns Phase 1 routes schema UI existing FCM push mobile deep-link handling worker patterns and notification inbox"
    ---
    name: quality-gate
    description: Use when code changes are ready for validation, before claiming a feature is complete or handing work back for review.
    ---
    
    # Quality Gate
    
    Run the affected package checks in this order:
    
    1. **Lint** â€” use the package's lint script.
    2. **Typecheck** â€” use the package's typecheck script, or `npx tsc --noEmit` when the package has TypeScript but no script.
    3. **Test** â€” run the package test script, preferably in CI/non-watch mode.
    4. **Build** â€” run the package build script or its documented framework equivalent.
    
    Use the smallest set of affected packages, but include every package touched by the change. In this repository:
    
    - Root web/server: `npm run build` is the available build command. Use the package's existing lint/test commands when present.
    - `mobile-app`: run `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, then `npx expo export --platform web` unless a more specific release build is required.
    
    Do not install dependencies, change scripts, or weaken checks to make the gate pass without user authorization. Stop at the first failed stage, fix the cause, then rerun the full sequence from lint. If a required command does not exist, report it explicitly and run the closest supported equivalent; never imply that stage passed.
    
    Final reports must name each command, its result, and any pre-existing or unrelated failures. Only call the change complete when all applicable stages have fresh passing evidence.
    
      warning: skill is from graphify 0.8.36, package is 0.9.12. Run 'graphify install' to update.
    Traversal: BFS depth=2 | Start: ['notificationCampaigns.ts', 'notification-campaigns.test.ts', 'push()', '1. UX Design (Tactical SITREP)', 'CampaignStatus', 'Deep Testing Remediation Implementation Plan', 'Existing system context', 'fcm.ts', 'Error handling', 'inbox.tsx', 'Linking()', 'Mobile Admin NativeWind Migration Design', 'Notification', 'Anti-Patterns (Do NOT Use)', 'Phase 3: Optimize for Performance', 'routes.tsx', 'requestSchema.ts', 'web-push-service-worker.test.ts'] | 406 nodes found
    
    NODE entry-5394e4b3b24662aa4aa133877b65a004.js [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L1 community=0]
    NODE cn() [src=src/app/components/ui/utils.ts loc=L4 community=9]
    NODE r() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=0]
    NODE e() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L3 community=15]
    NODE index.ts [src=server/index.ts loc=L1 community=40]
    NODE PersonnelV2Page.tsx [src=src/app/personnel-v2/PersonnelV2Page.tsx loc=L1 community=34]
    NODE utils.ts [src=src/app/components/ui/utils.ts loc=L1 community=29]
    NODE PersonnelDashboard.tsx [src=src/app/pages/PersonnelDashboard.tsx loc=L1 community=29]
    NODE LocationContext.tsx [src=mobile-app/context/LocationContext.tsx loc=L1 community=57]
    NODE AnalyticsHub.tsx [src=src/app/pages/Admin/AnalyticsHub.tsx loc=L1 community=33]
    NODE DispatchConsole.tsx [src=src/app/pages/Admin/DispatchConsole.tsx loc=L1 community=29]
    NODE index.ts [src=src/app/types/index.ts loc=L1 community=22]
    NODE requests.ts [src=server/routes/requests.ts loc=L1 community=46]
    NODE RequestDetailsPanel.tsx [src=src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx loc=L1 community=123]
    NODE AdminLayout.tsx [src=src/app/pages/Admin/AdminLayout.tsx loc=L1 community=17]
    NODE AdminMessaging.tsx [src=src/app/pages/Admin/AdminMessaging.tsx loc=L1 community=45]
    NODE index.tsx [src=mobile-app/app/(tabs)/index.tsx loc=L1 community=49]
    NODE messaging.ts [src=server/services/messaging.ts loc=L1 community=53]
    NODE apiService.ts [src=mobile-app/services/apiService.ts loc=L1 community=141]
    NODE RiderDashboard.tsx [src=src/app/pages/RiderDashboard.tsx loc=L1 community=29]
    NODE button.tsx [src=src/app/components/ui/button.tsx loc=L1 community=29]
    NODE Dashboard.tsx [src=src/app/pages/Dashboard.tsx loc=L1 community=17]
    NODE _layout.tsx [src=mobile-app/app/_layout.tsx loc=L1 community=73]
    NODE tomorrow.tsx [src=mobile-app/app/(tabs)/tomorrow.tsx loc=L1 community=49]
    NODE users.ts [src=server/routes/users.ts loc=L1 community=171]
    NODE LiveTrackingMap.tsx [src=src/app/components/LiveTrackingMap.tsx loc=L1 community=82]
    NODE CalendarView.tsx [src=src/app/pages/Admin/CalendarView.tsx loc=L1 community=29]
    NODE DeliveryRequest [src=src/app/types/index.ts loc=L155 community=22]
    NODE notifications.ts [src=server/routes/notifications.ts loc=L1 community=75]
    NODE Button [src=src/app/components/ui/button.tsx loc=L43 community=29]
    NODE auth.ts [src=server/routes/auth.ts loc=L1 community=66]
    NODE useLocation() [src=mobile-app/context/LocationContext.tsx loc=L1088 community=24]
    NODE DataContext.tsx [src=src/app/context/DataContext.tsx loc=L1 community=11]
    NODE LiveTrackingDashboard.tsx [src=src/app/pages/LiveTrackingDashboard.tsx loc=L1 community=205]
    NODE useData() [src=src/app/context/DataContext.tsx loc=L783 community=11]
    NODE responsive.ts [src=mobile-app/utils/responsive.ts loc=L1 community=49]
    NODE db.ts [src=server/db.ts loc=L1 community=55]
    NODE useAuth() [src=src/app/context/AuthContext.tsx loc=L186 community=17]
    NODE conversations.ts [src=server/routes/conversations.ts loc=L1 community=69]
    NODE pool [src=server/db.ts loc=L21 community=55]
    NODE overdue.tsx [src=mobile-app/app/(tabs)/overdue.tsx loc=L1 community=49]
    NODE useMessaging.ts [src=mobile-app/hooks/useMessaging.ts loc=L1 community=25]
    NODE webPushQueue.ts [src=server/services/webPushQueue.ts loc=L1 community=52]
    NODE card.tsx [src=src/app/components/ui/card.tsx loc=L1 community=29]
    NODE AuthContext.tsx [src=src/app/context/AuthContext.tsx loc=L1 community=123]
    NODE scale() [src=mobile-app/utils/responsive.ts loc=L13 community=49]
    NODE verticalScale() [src=mobile-app/utils/responsive.ts loc=L19 community=49]
    NODE dialog.tsx [src=src/app/components/ui/dialog.tsx loc=L1 community=29]
    NODE ShiftControlCard.tsx [src=mobile-app/components/ShiftControlCard.tsx loc=L1 community=24]
    NODE history.tsx [src=mobile-app/app/(tabs)/history.tsx loc=L1 community=49]
    NODE badge.tsx [src=src/app/components/ui/badge.tsx loc=L1 community=29]
    NODE analytics.ts [src=server/routes/analytics.ts loc=L1 community=55]
    NODE locationTracking.ts [src=server/locationTracking.ts loc=L1 community=40]
    NODE syncQueue.ts [src=mobile-app/services/syncQueue.ts loc=L1 community=141]
    NODE AuthContext.tsx [src=mobile-app/context/AuthContext.tsx loc=L1 community=73]
    NODE _layout.tsx [src=mobile-app/app/(tabs)/_layout.tsx loc=L1 community=306]
    NODE useDashboard() [src=mobile-app/hooks/data/useDashboard.ts loc=L11 community=73]
    NODE Login.tsx [src=src/app/pages/Login.tsx loc=L1 community=29]
    NODE Badge() [src=src/app/components/ui/badge.tsx loc=L28 community=29]
    NODE MapPicker.tsx [src=src/app/components/MapPicker.tsx loc=L1 community=34]
    NODE value() [src=mobile-admin/.expo/login-redesign/android/_expo/static/js/android/entry-5394e4b3b24662aa4aa133877b65a004.js loc=L701 community=129]
    NODE useDashboard.ts [src=mobile-app/hooks/data/useDashboard.ts loc=L1 community=73]
    NODE notificationCampaigns.ts [src=server/routes/notificationCampaigns.ts loc=L1 community=43]
    NODE auth.ts [src=server/middleware/auth.ts loc=L1 community=91]
    NODE NotificationCampaigns.tsx [src=src/app/pages/Admin/NotificationCampaigns.tsx loc=L1 community=47]
    NODE shiftSchedule.ts [src=server/services/shiftSchedule.ts loc=L1 community=20]
    NODE useMessaging() [src=mobile-app/hooks/useMessaging.ts loc=L17 community=25]
    NODE ShiftControlDrawer.tsx [src=mobile-app/components/ShiftControlDrawer.tsx loc=L1 community=56]
    NODE Card() [src=src/app/components/ui/card.tsx loc=L5 community=29]
    NODE Job [src=mobile-app/types/index.ts loc=L1 community=24]
    NODE dropdown-menu.tsx [src=src/app/components/ui/dropdown-menu.tsx loc=L1 community=17]
    NODE NotificationBell.tsx [src=src/app/components/Admin/NotificationBell.tsx loc=L1 community=17]
    ... (truncated — 334 more nodes cut by ~2000-token budget. Narrow with context_filter=['call'] or use get_node for a specific symbol)
    ✓ • 1.88s

## Activity

    $ Get-Content mobile-app/utils/pushNotificationEvents.ts; Get-Content mobile-app/hooks/use-push-notifications.ts; Get-Content server/services/proactiveOverdue.ts; Get-Content server/services/notificationCampaigns.ts; Get-Content server/routes/notificationCampaigns.ts; Get-Content src/app/pages/Admin/NotificationCampaigns.tsx
    type QueryInvalidator = {
      invalidateQueries: (query: { queryKey: readonly unknown[] }) => unknown;
    };
    
    export function getPushEventKey(data: Record<string, unknown> = {}, fallback?: string): string | null {
      const key = data.eventId || data.notificationId || data.messageId || data.message_id || fallback;
      return key == null || key === '' ? null : String(key);
    }
    
    export function invalidateRiderPushQueries(
      queryClient: QueryInvalidator,
      userId: string | undefined,
      data: Record<string, unknown> = {},
    ): void {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
      queryClient.invalidateQueries({ queryKey: ['historyTasks', userId] });
      const requestId = data.request_id || data.requestId;
      if (requestId) queryClient.invalidateQueries({ queryKey: ['job', userId, String(requestId)] });
    }
    import { useState, useEffect, useRef } from 'react';
    import { Platform } from 'react-native';
    import { isRunningInExpoGo } from 'expo';
    import * as Device from 'expo-device';
    import type { Notification } from 'expo-notifications';
    import { useRouter } from 'expo-router';
    import { useQueryClient } from '@tanstack/react-query';
    import { initializeDeliveryNotificationChannels, presentForegroundPushNotification, routeNotificationResponse, routePushData } from '@/services/deliveryNotifications';
    import { getPushEventKey, invalidateRiderPushQueries } from '@/utils/pushNotificationEvents';
    import { listenForFcmTokenRefresh, registerFcmToken } from '@/services/pushTokenService';
    import { createFirebaseMessagingClient, type FirebaseMessagingApi } from '@/services/firebaseMessagingClient';
    
    const DISABLE_PUSH = false;
    let permissionDeniedThisSession = false;
    
    const Notifications = Platform.OS === 'web' || isRunningInExpoGo()
      ? undefined
      : (require('expo-notifications') as typeof import('expo-notifications'));
    
    function loadFirebaseMessaging() {
      if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
      try {
        const messagingModule = require('@react-native-firebase/messaging') as FirebaseMessagingApi;
        return createFirebaseMessagingClient(messagingModule);
      } catch {
        console.warn('[PUSH] Firebase Messaging is unavailable in this native build.');
        return null;
      }
    }
    
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
    
    export function usePushNotifications(userId?: string) {
      const router = useRouter();
      const queryClient = useQueryClient();
      const [fcmToken, setFcmToken] = useState('');
      const [notification, setNotification] = useState<Notification | false>(false);
      const lastHandledResponses = useRef(new Set<string>());
    
      useEffect(() => {
        if (!Notifications || DISABLE_PUSH || !userId) return;
        const messaging = loadFirebaseMessaging();
        if (!messaging) return;
    
        let isMounted = true;
        const handledResponses = lastHandledResponses.current;
        const rememberResponse = (key: string | null) => {
          if (!key) return true;
          if (handledResponses.has(key)) return false;
          handledResponses.add(key);
          if (handledResponses.size > 100) {
            const oldest = handledResponses.values().next().value;
            if (oldest) handledResponses.delete(oldest);
          }
          return true;
        };
        const refreshForData = (data: Record<string, unknown>) => {
          invalidateRiderPushQueries(queryClient, userId, data);
        };
        const handleFirebaseOpen = (message: any) => {
          if (!isMounted || !message) return;
          const data = message.data || {};
          if (!rememberResponse(getPushEventKey(data, message.messageId))) return;
          refreshForData(data);
          routePushData(data, router as never);
        };
        const handleNotificationResponse = (response: import('expo-notifications').NotificationResponse) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          const fallback = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
          if (!rememberResponse(getPushEventKey(data, fallback))) return;
          refreshForData(data);
          routeNotificationResponse(response as never, router as never);
        };
    
        let unsubscribeTokenRefresh: () => void = () => {};
        void registerForPushNotificationsAsync(messaging)
          .then((token) => {
            if (!isMounted || !token) return;
            setFcmToken(token);
            unsubscribeTokenRefresh = listenForFcmTokenRefresh(messaging, Platform.OS as 'android' | 'ios', () => {
              console.warn('[PUSH] Unable to register a refreshed FCM token.');
            });
          })
          .catch(() => console.warn('[PUSH] FCM registration failed.'));
    
        const messageSubscription = messaging.onMessage((message) => {
          if (!isMounted) return;
          setNotification(message as Notification);
          refreshForData(message.data || {});
          void presentForegroundPushNotification(message).catch(() => {
            console.warn('[PUSH] Unable to show foreground notification.');
          });
        });
        const openedSubscription = messaging.onNotificationOpenedApp(handleFirebaseOpen);
        const notificationListener = Notifications.addNotificationReceivedListener((received) => {
          if (!isMounted) return;
          setNotification(received);
          refreshForData(received.request.content.data as Record<string, unknown>);
        });
        const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    
        void messaging.getInitialNotification().then(handleFirebaseOpen).catch(() => undefined);
        void Notifications.getLastNotificationResponseAsync().then((response) => {
          if (!isMounted || !response) return;
          handleNotificationResponse(response);
          void Notifications.clearLastNotificationResponseAsync();
        }).catch(() => undefined);
    
        return () => {
          isMounted = false;
          unsubscribeTokenRefresh();
          messageSubscription();
          openedSubscription();
          notificationListener.remove();
          responseListener.remove();
        };
      }, [queryClient, router, userId]);
    
      return { fcmToken, notification };
    }
    
    async function registerForPushNotificationsAsync(messaging: NonNullable<ReturnType<typeof loadFirebaseMessaging>>): Promise<string | null> {
      if (!Notifications || DISABLE_PUSH || isRunningInExpoGo() || !Device.isDevice || permissionDeniedThisSession) return null;
    
      await initializeDeliveryNotificationChannels();
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        if (existingStatus === 'denied' && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
          const current = await Notifications.getPermissionsAsync();
          if (current.canAskAgain === false) {
            permissionDeniedThisSession = true;
            return null;
          }
        }
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        permissionDeniedThisSession = true;
        return null;
      }
    
      return registerFcmToken(messaging, Platform.OS as 'android' | 'ios');
    }
    import { randomUUID } from 'crypto';
    import { Server } from 'socket.io';
    import { pool } from '../db';
    import { sendPushNotification } from '../routes/notifications';
    
    function formatOverdueDuration(minutes: number): string {
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
    }
    import { getOverdueWarningThresholdMinutes, getProactiveOverdueMetadata, getScheduledEndAt } from '../utils/overdue';
    
    const TERMINAL = ['completed', 'delivered', 'failed', 'cancelled', 'disapproved'];
    
    const toMysqlDateTime = (iso: string) => iso.slice(0, 19).replace('T', ' ');
    
    export const processProactiveOverdueAlerts = async (io: Server) => {
      const now = new Date();
      const [rows] = await pool.query(`
        SELECT request_id, status, delivery_status, delivery_date, time_window,
               scheduled_end_at, assigned_rider_id, requester_id, pickup_address,
               dropoff_address, recipient_contact, dropoff_lat, dropoff_lng
        FROM delivery_requests
        WHERE status = 'approved'
          AND delivery_date IS NOT NULL
          AND COALESCE(delivery_status, '') NOT IN (?, ?, ?, ?, ?)
        ORDER BY delivery_date, time_window
        LIMIT 1000
      `, TERMINAL);
    
      const adminsResult = await pool.query('SELECT id FROM users WHERE role = ?', ['admin']);
      const adminIds = (adminsResult[0] as Array<{ id: string }>).map((admin) => admin.id);
    
      for (const row of rows as any[]) {
        const scheduledEndAt = getScheduledEndAt(row.delivery_date, row.time_window);
        if (!scheduledEndAt) continue;
        const computedSqlDate = toMysqlDateTime(scheduledEndAt);
        const existingSqlDate = typeof row.scheduled_end_at === 'string'
          ? row.scheduled_end_at.slice(0, 19)
          : row.scheduled_end_at instanceof Date
            ? row.scheduled_end_at.toISOString().slice(0, 19).replace('T', ' ')
            : null;
    
        if (existingSqlDate !== computedSqlDate) {
          await pool.query(`
            UPDATE delivery_requests
            SET scheduled_end_at = ?, at_risk_notified_at = NULL, overdue_notified_at = NULL
            WHERE request_id = ? AND delivery_date = ? AND time_window = ?
              AND (scheduled_end_at IS NULL OR scheduled_end_at <> ?)
          `, [computedSqlDate, row.request_id, row.delivery_date, row.time_window, computedSqlDate]);
        }
    
        const metadata = getProactiveOverdueMetadata({ ...row, scheduled_end_at: scheduledEndAt }, now);
        if (metadata.state === 'Normal') continue;
        const event = metadata.state === 'Overdue' ? 'overdue' : 'at_risk';
        const markerColumn = event === 'overdue' ? 'overdue_notified_at' : 'at_risk_notified_at';
        const connection = await pool.getConnection();
        let notifications: Array<{ id: string; user_id: string; message: string; type: string; request_id: string }> = [];
        let assignedRiderId: string | null = null;
        let deliveryDetails: any = {};
        try {
          await connection.beginTransaction();
          const [lockedRows] = await connection.query(`
            SELECT request_id, delivery_status, status, delivery_date, time_window, assigned_rider_id,
                   scheduled_end_at, at_risk_notified_at, overdue_notified_at, pickup_address,
                   dropoff_address, recipient_contact, dropoff_lat, dropoff_lng
            FROM delivery_requests WHERE request_id = ? FOR UPDATE
          `, [row.request_id]);
          const current = (lockedRows as any[])[0];
          if (!current || TERMINAL.includes(String(current.delivery_status || '').toLowerCase()) || TERMINAL.includes(String(current.status || '').toLowerCase())) {
            await connection.rollback();
            continue;
          }
    
          const wasAlreadyNotified = Boolean(current[markerColumn]);
          let isOverdueFollowUp = false;
          if (wasAlreadyNotified) {
            if (event !== 'overdue' || !current.overdue_notified_at || now.getTime() - new Date(current.overdue_notified_at).getTime() < 2 * 60 * 60 * 1000) {
              await connection.rollback();
              continue;
            }
            const [existingReminders] = await connection.query(
              'SELECT id FROM notifications WHERE request_id = ? AND type = ? LIMIT 1',
              [row.request_id, 'delivery_overdue_reminder'],
            );
            if ((existingReminders as any[]).length > 0) {
              await connection.rollback();
              continue;
            }
            isOverdueFollowUp = true;
          }
    
          const lockedDeadline = getScheduledEndAt(current.delivery_date, current.time_window);
          if (!lockedDeadline) {
            await connection.rollback();
            continue;
          }
          const currentMetadata = getProactiveOverdueMetadata({ ...current, scheduled_end_at: lockedDeadline }, now);
          if (currentMetadata.state !== metadata.state) {
            await connection.rollback();
            continue;
          }
    
          const currentRecipients = [...new Set([current.assigned_rider_id, ...adminIds].filter(Boolean))] as string[];
          if (currentRecipients.length === 0) {
            await connection.rollback();
            continue;
          }
          assignedRiderId = current.assigned_rider_id;
          deliveryDetails = current;
    
          const lockedSqlDeadline = toMysqlDateTime(lockedDeadline);
          if (event === 'overdue' && !isOverdueFollowUp) {
            await connection.query(
              `UPDATE delivery_requests SET scheduled_end_at = ?, ${markerColumn} = ?, overdue_at = COALESCE(overdue_at, ?) WHERE request_id = ?`,
              [lockedSqlDeadline, now, lockedSqlDeadline, row.request_id],
            );
          } else {
            await connection.query(
              `UPDATE delivery_requests SET scheduled_end_at = ?, ${markerColumn} = ? WHERE request_id = ?`,
              [lockedSqlDeadline, now, row.request_id],
            );
          }
          const minutes = event === 'overdue' ? metadata.overdue_minutes : metadata.remaining_minutes;
          const message = event === 'overdue'
            ? `Delivery #${String(row.request_id).slice(-6).toUpperCase()} is overdue by ${formatOverdueDuration(minutes)}.`
            : `Delivery #${String(row.request_id).slice(-6).toUpperCase()} is at risk and due in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
          const type = event === 'overdue'
            ? (isOverdueFollowUp ? 'delivery_overdue_reminder' : 'delivery_overdue')
            : 'delivery_at_risk';
          for (const userId of currentRecipients) {
            const id = `notif_${randomUUID()}`;
            await connection.query(
              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
              [id, userId, message, type, row.request_id],
            );
            notifications.push({ id, user_id: userId, message, type, request_id: row.request_id });
          }
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          console.error(`[OVERDUE ALERT] Could not process ${row.request_id}:`, error);
          notifications = [];
        } finally {
          connection.release();
        }
    
        for (const notification of notifications) {
          io.to(notification.user_id).emit('notification-added', notification);
        }
        const riderNotification = notifications.find((notification) => notification.user_id === assignedRiderId);
        if (riderNotification && assignedRiderId) {
          const isOverdue = event === 'overdue';
          void sendPushNotification(
            assignedRiderId,
            isOverdue ? (riderNotification.type === 'delivery_overdue_reminder' ? 'Delivery overdue reminder' : 'Delivery Overdue') : 'Delivery at risk',
            deliveryDetails.pickup_address && deliveryDetails.dropoff_address
              ? `${riderNotification.message} ${deliveryDetails.pickup_address} â†’ ${deliveryDetails.dropoff_address}`
              : riderNotification.message,
            {
              notificationId: riderNotification.id,
              request_id: row.request_id,
              type: riderNotification.type,
              ...(deliveryDetails.recipient_contact ? { recipient_contact: deliveryDetails.recipient_contact } : {}),
              ...(deliveryDetails.dropoff_lat != null ? { dropoff_lat: deliveryDetails.dropoff_lat } : {}),
              ...(deliveryDetails.dropoff_lng != null ? { dropoff_lng: deliveryDetails.dropoff_lng } : {}),
            },
            {
              channelId: isOverdue ? 'delivery_urgent' : 'delivery_updates',
              categoryId: deliveryDetails.recipient_contact && deliveryDetails.dropoff_lat != null && deliveryDetails.dropoff_lng != null
                ? 'DELIVERY_TASK_CALL_MAP'
                : deliveryDetails.recipient_contact ? 'DELIVERY_TASK_CALL'
                  : deliveryDetails.dropoff_lat != null && deliveryDetails.dropoff_lng != null ? 'DELIVERY_TASK_MAP' : 'DELIVERY_TASK',
              tag: `delivery:${row.request_id}:${riderNotification.type}`,
            },
          );
        }
        if (notifications.length > 0) {
          io.to('admin-room').emit('request-updated', { request_id: row.request_id, overdue_state: metadata.state });
          if (assignedRiderId) io.to(assignedRiderId).emit('request-updated', { request_id: row.request_id, overdue_state: metadata.state });
        }
      }
    };
    
    export const startProactiveOverdueWorker = (io: Server) => {
      let running = false;
      const run = async () => {
        if (running) return;
        running = true;
        try {
          await processProactiveOverdueAlerts(io);
        } catch (error) {
          console.error('[OVERDUE ALERT] Worker pass failed:', error);
        } finally {
          running = false;
        }
      };
      void run();
      const timer = setInterval(() => void run(), 30_000);
      timer.unref?.();
      return timer;
    };
    import crypto from 'crypto';
    
    export type CampaignDb = { query: (sql: string, values?: any[]) => Promise<any> };
    
    export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] as const;
    export const CAMPAIGN_TARGETS = ['all_riders', 'selected_riders', 'no_attendance', 'present', 'absent_or_leave', 'on_duty', 'off_duty', 'active_tasks', 'overdue_tasks'] as const;
    export const CAMPAIGN_DESTINATIONS = ['dashboard', 'shift', 'today', 'overdue', 'inbox'] as const;
    
    export async function ensureNotificationCampaignTables(db: CampaignDb): Promise<void> {
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaigns (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        notification_title VARCHAR(120) NOT NULL,
        notification_body VARCHAR(500) NOT NULL,
        status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
        target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
        schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
        start_date DATE NOT NULL,
        end_date DATE NULL,
        send_time TIME NOT NULL,
        time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
        weekdays JSON NULL,
        repeat_interval_minutes INT NULL,
        max_sends_per_rider INT NOT NULL DEFAULT 1,
        destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
        created_by VARCHAR(191) NOT NULL,
        updated_by VARCHAR(191) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign_status_start (status, start_date, send_time)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(191) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, rider_id),
        CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
        id VARCHAR(64) PRIMARY KEY,
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(191) NOT NULL,
        scheduled_at DATETIME NOT NULL,
        attempt_number INT NOT NULL DEFAULT 1,
        status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
        provider_message_id VARCHAR(255) NULL,
        failure_reason VARCHAR(500) NULL,
        idempotency_key VARCHAR(191) NOT NULL,
        sent_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
        INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
        CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
      )`);
    }
    
    export function newCampaignId(): string {
      return `campaign_${crypto.randomUUID()}`;
    }
    import crypto from 'crypto';
    import { Router, Response } from 'express';
    import { z } from 'zod';
    import { pool } from '../db';
    import { AuthRequest, authorize } from '../middleware/auth';
    import { logAction } from '../services/auditLogger';
    import { CAMPAIGN_DESTINATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TARGETS, newCampaignId } from '../services/notificationCampaigns';
    import { sendPushNotification } from './notifications';
    
    const router = Router();
    router.use(authorize(['admin']));
    
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const campaignInput = z.object({
      name: z.string().trim().min(2).max(120),
      notification_title: z.string().trim().min(1).max(120),
      notification_body: z.string().trim().min(1).max(500),
      target_type: z.enum(CAMPAIGN_TARGETS),
      schedule_type: z.enum(['immediate', 'one_time', 'recurring']),
      start_date: z.string().regex(datePattern),
      end_date: z.string().regex(datePattern).nullable().optional(),
      send_time: z.string().regex(timePattern),
      weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
      repeat_interval_minutes: z.number().int().min(5).max(10080).nullable().optional(),
      max_sends_per_rider: z.number().int().min(1).max(20),
      destination: z.enum(CAMPAIGN_DESTINATIONS),
      rider_ids: z.array(z.string().min(1).max(64)).max(500).default([]),
    }).superRefine((value, ctx) => {
      if (value.end_date && value.end_date < value.start_date) ctx.addIssue({ code: 'custom', path: ['end_date'], message: 'End date must be on or after start date' });
      if (value.schedule_type === 'recurring' && value.weekdays.length === 0) ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Select at least one weekday' });
      if (value.target_type === 'selected_riders' && value.rider_ids.length === 0) ctx.addIssue({ code: 'custom', path: ['rider_ids'], message: 'Select at least one rider' });
    });
    
    const lifecycle: Record<string, { from: string[]; to: typeof CAMPAIGN_STATUSES[number] }> = {
      activate: { from: ['draft', 'paused'], to: 'active' },
      pause: { from: ['active', 'scheduled'], to: 'paused' },
      resume: { from: ['paused'], to: 'active' },
      cancel: { from: ['draft', 'scheduled', 'active', 'paused'], to: 'cancelled' },
    };
    
    function normalizeCampaign(row: any) {
      return {
        ...row,
        weekdays: typeof row.weekdays === 'string' ? JSON.parse(row.weekdays || '[]') : row.weekdays || [],
        recipient_count: Number(row.recipient_count || 0),
        delivery_count: Number(row.delivery_count || 0),
      };
    }
    
    async function getCampaign(id: string) {
      const [rows]: any = await pool.query(`SELECT c.*,
        (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
        (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
        FROM notification_campaigns c WHERE c.id=? LIMIT 1`, [id]);
      if (!rows[0]) return null;
      const [recipients]: any = await pool.query(`SELECT u.id, u.name, u.email FROM notification_campaign_recipients cr
        JOIN users u ON u.id=cr.rider_id WHERE cr.campaign_id=? ORDER BY u.name`, [id]);
      return { ...normalizeCampaign(rows[0]), recipients };
    }
    
    async function audit(req: AuthRequest, action: string, campaignId: string, oldValues: any, newValues: any) {
      await logAction({ actor_id: String(req.user!.id), actor_role: 'admin', action, resource_type: 'notification_campaign',
        resource_id: campaignId, old_values: oldValues, new_values: newValues,
        ip_address: req.ip, user_agent: req.get('user-agent') || undefined });
    }
    
    router.get('/riders', async (_req: AuthRequest, res: Response) => {
      const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND status <> 'inactive' ORDER BY name");
      res.json(rows);
    });
    
    router.get('/', async (_req: AuthRequest, res: Response) => {
      try {
        const [rows]: any = await pool.query(`SELECT c.*,
          (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
          (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
          FROM notification_campaigns c ORDER BY c.updated_at DESC`);
        res.json(rows.map(normalizeCampaign));
      } catch (error) {
        console.error('Campaign list failed:', error);
        res.status(500).json({ error: 'Failed to load notification campaigns' });
      }
    });
    
    router.get('/:id/deliveries', async (req: AuthRequest, res: Response) => {
      const [rows] = await pool.query(`SELECT d.*, u.name rider_name, u.email rider_email
        FROM notification_campaign_deliveries d JOIN users u ON u.id=d.rider_id
        WHERE d.campaign_id=? ORDER BY d.created_at DESC LIMIT 500`, [String(req.params.id)]);
      res.json(rows);
    });
    
    router.get('/:id', async (req: AuthRequest, res: Response) => {
      const campaign = await getCampaign(String(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      res.json(campaign);
    });
    
    router.post('/', async (req: AuthRequest, res: Response) => {
      const parsed = campaignInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
      const data = parsed.data;
      const id = newCampaignId();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`INSERT INTO notification_campaigns
          (id,name,notification_title,notification_body,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
          VALUES (?,?,?,?,?,?,?,?,?,'Asia/Manila',?,?,?,?,?,?)`, [id, data.name, data.notification_title, data.notification_body,
          data.target_type, data.schedule_type, data.start_date, data.end_date || null, data.send_time, JSON.stringify(data.weekdays),
          data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, req.user!.id]);
        for (const riderId of new Set(data.rider_ids)) {
          await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
            SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
        }
        await conn.commit();
        const created = await getCampaign(id);
        await audit(req, 'notification_campaign_created', id, null, created);
        res.status(201).json(created);
      } catch (error: any) {
        await conn.rollback();
        console.error('Campaign creation failed:', error);
        res.status(error?.code === 'ER_NO_REFERENCED_ROW_2' ? 400 : 500).json({ error: 'Failed to create notification campaign' });
      } finally { conn.release(); }
    });
    
    router.patch('/:id', async (req: AuthRequest, res: Response) => {
      const id = String(req.params.id);
      const parsed = campaignInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign' });
      const previous = await getCampaign(id);
      if (!previous) return res.status(404).json({ error: 'Campaign not found' });
      if (!['draft', 'paused'].includes(previous.status)) return res.status(409).json({ error: 'Only draft or paused campaigns can be edited' });
      const data = parsed.data;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(`UPDATE notification_campaigns SET name=?,notification_title=?,notification_body=?,target_type=?,schedule_type=?,
          start_date=?,end_date=?,send_time=?,weekdays=?,repeat_interval_minutes=?,max_sends_per_rider=?,destination=?,updated_by=? WHERE id=?`,
        [data.name, data.notification_title, data.notification_body, data.target_type, data.schedule_type, data.start_date, data.end_date || null,
          data.send_time, JSON.stringify(data.weekdays), data.repeat_interval_minutes || null, data.max_sends_per_rider, data.destination, req.user!.id, id]);
        await conn.query('DELETE FROM notification_campaign_recipients WHERE campaign_id=?', [id]);
        for (const riderId of new Set(data.rider_ids)) {
          await conn.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
            SELECT ?, id FROM users WHERE id=? AND role='rider'`, [id, riderId]);
        }
        await conn.commit();
        const updated = await getCampaign(id);
        await audit(req, 'notification_campaign_updated', id, previous, updated);
        res.json(updated);
      } catch (error) {
        await conn.rollback();
        console.error('Campaign update failed:', error);
        res.status(500).json({ error: 'Failed to update notification campaign' });
      } finally { conn.release(); }
    });
    
    router.post('/:id/duplicate', async (req: AuthRequest, res: Response) => {
      const source = await getCampaign(String(req.params.id));
      if (!source) return res.status(404).json({ error: 'Campaign not found' });
      const id = newCampaignId();
      await pool.query(`INSERT INTO notification_campaigns
        (id,name,notification_title,notification_body,status,target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,created_by,updated_by)
        SELECT ?,CONCAT(name,' (Copy)'),notification_title,notification_body,'draft',target_type,schedule_type,start_date,end_date,send_time,time_zone,weekdays,repeat_interval_minutes,max_sends_per_rider,destination,?,?
        FROM notification_campaigns WHERE id=?`, [id, req.user!.id, req.user!.id, source.id]);
      await pool.query(`INSERT INTO notification_campaign_recipients (campaign_id,rider_id)
        SELECT ?,rider_id FROM notification_campaign_recipients WHERE campaign_id=?`, [id, source.id]);
      const duplicate = await getCampaign(id);
      await audit(req, 'notification_campaign_duplicated', id, { source_id: source.id }, duplicate);
      res.status(201).json(duplicate);
    });
    
    router.post('/:id/test', async (req: AuthRequest, res: Response) => {
      const campaign = await getCampaign(String(req.params.id));
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      const riderId = z.string().min(1).max(64).safeParse(req.body?.rider_id);
      if (!riderId.success) return res.status(400).json({ error: 'Select a rider for the test notification' });
      const [riders]: any = await pool.query("SELECT id, fcm_token, expo_push_token FROM users WHERE id=? AND role='rider' LIMIT 1", [riderId.data]);
      if (!riders[0]) return res.status(404).json({ error: 'Rider not found' });
      if (!riders[0].fcm_token && !riders[0].expo_push_token) return res.status(409).json({ error: 'The selected rider has no registered push device' });
      const notificationId = `notif_${crypto.randomUUID()}`;
      await pool.query(`INSERT INTO notifications (id,user_id,message,type,request_id) VALUES (?,? ,?,'campaign_test',NULL)`,
        [notificationId, riderId.data, `[TEST] ${campaign.notification_body}`]);
      req.app.get('io')?.to(riderId.data).emit('notification-added', { id: notificationId, message: `[TEST] ${campaign.notification_body}`, type: 'campaign_test' });
      await sendPushNotification(riderId.data, `[TEST] ${campaign.notification_title}`, campaign.notification_body,
        { type: 'campaign_test', campaignId: campaign.id, notificationId, destination: campaign.destination });
      await audit(req, 'notification_campaign_test_sent', campaign.id, null, { rider_id: riderId.data, notification_id: notificationId });
      res.json({ success: true, notification_id: notificationId });
    });
    
    for (const action of Object.keys(lifecycle)) {
      router.post(`/:id/${action}`, async (req: AuthRequest, res: Response) => {
        const id = String(req.params.id);
        const transition = lifecycle[action];
        const previous = await getCampaign(id);
        if (!previous) return res.status(404).json({ error: 'Campaign not found' });
        if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
        await pool.query('UPDATE notification_campaigns SET status=?, updated_by=? WHERE id=?', [transition.to, req.user!.id, id]);
        const updated = await getCampaign(id);
        const auditAction = action === 'cancel' ? 'notification_campaign_cancelled' : `notification_campaign_${action}d`;
        await audit(req, auditAction, id, { status: previous.status }, { status: transition.to });
        res.json(updated);
      });
    }
    
    export default router;
    import { useCallback, useEffect, useMemo, useState } from 'react';
    import { BellRing, CalendarClock, Copy, Loader2, Pause, Play, Plus, Send, XCircle } from 'lucide-react';
    import { toast } from 'sonner';
    import { Button } from '../../components/ui/button';
    import { Card } from '../../components/ui/card';
    import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
    
    type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
    type Campaign = {
      id: string; name: string; notification_title: string; notification_body: string; status: CampaignStatus;
      target_type: string; schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string | null;
      send_time: string; weekdays: number[]; repeat_interval_minutes: number | null; max_sends_per_rider: number;
      destination: string; recipient_count: number; delivery_count: number; recipients?: Rider[];
    };
    type Rider = { id: string; name: string; email: string };
    
    const weekdayOptions = [
      [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
    ] as const;
    const targetOptions = [
      ['all_riders', 'All riders'], ['selected_riders', 'Selected riders'], ['no_attendance', 'No attendance'],
      ['present', 'Present riders'], ['absent_or_leave', 'Absent or on leave'], ['on_duty', 'On-duty riders'],
      ['off_duty', 'Off-duty riders'], ['active_tasks', 'Riders with active tasks'], ['overdue_tasks', 'Riders with overdue tasks'],
    ] as const;
    const destinationOptions = [
      ['dashboard', 'Rider dashboard'], ['shift', 'Shift controls'], ['today', "Today's tasks"], ['overdue', 'Overdue tasks'], ['inbox', 'Inbox'],
    ] as const;
    
    const philippineDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    type CampaignForm = {
      name: string; notification_title: string; notification_body: string; target_type: string;
      schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string; send_time: string;
      weekdays: number[]; repeat_interval_minutes: string; max_sends_per_rider: number; destination: string; rider_ids: string[];
    };
    const emptyForm = (): CampaignForm => ({
      name: '', notification_title: '', notification_body: '', target_type: 'all_riders', schedule_type: 'one_time',
      start_date: philippineDate(), end_date: '', send_time: '08:00', weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: '',
      max_sends_per_rider: 1, destination: 'dashboard', rider_ids: [] as string[],
    });
    
    async function request(path: string, init?: RequestInit) {
      const response = await fetch(`/api/notification-campaigns${path}`, {
        credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Campaign request failed');
      return data;
    }
    
    export function NotificationCampaigns() {
      const [campaigns, setCampaigns] = useState<Campaign[]>([]);
      const [riders, setRiders] = useState<Rider[]>([]);
      const [loading, setLoading] = useState(true);
      const [saving, setSaving] = useState(false);
      const [editorOpen, setEditorOpen] = useState(false);
      const [editingId, setEditingId] = useState<string | null>(null);
      const [form, setForm] = useState<CampaignForm>(emptyForm);
      const [testCampaign, setTestCampaign] = useState<Campaign | null>(null);
      const [testRiderId, setTestRiderId] = useState('');
    
      const load = useCallback(async () => {
        setLoading(true);
        try {
          const [campaignData, riderData] = await Promise.all([request('/'), request('/riders')]);
          setCampaigns(campaignData);
          setRiders(riderData);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load campaigns'); }
        finally { setLoading(false); }
      }, []);
      useEffect(() => { void load(); }, [load]);
    
      const stats = useMemo(() => ({
        total: campaigns.length,
        active: campaigns.filter(item => item.status === 'active').length,
        draft: campaigns.filter(item => item.status === 'draft').length,
        paused: campaigns.filter(item => item.status === 'paused').length,
      }), [campaigns]);
    
      const openCreate = () => { setEditingId(null); setForm(emptyForm()); setEditorOpen(true); };
      const openEdit = async (campaign: Campaign) => {
        try {
          const detail: Campaign = await request(`/${campaign.id}`);
          setEditingId(campaign.id);
          setForm({
            name: detail.name, notification_title: detail.notification_title, notification_body: detail.notification_body,
            target_type: detail.target_type, schedule_type: detail.schedule_type, start_date: detail.start_date.slice(0, 10),
            end_date: detail.end_date?.slice(0, 10) || '', send_time: detail.send_time.slice(0, 5), weekdays: detail.weekdays || [],
            repeat_interval_minutes: detail.repeat_interval_minutes == null ? '' : String(detail.repeat_interval_minutes),
            max_sends_per_rider: detail.max_sends_per_rider, destination: detail.destination,
            rider_ids: detail.recipients?.map(rider => rider.id) || [],
          });
          setEditorOpen(true);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to open campaign'); }
      };
    
      const saveCampaign = async () => {
        setSaving(true);
        try {
          const payload = { ...form, end_date: form.end_date || null,
            repeat_interval_minutes: form.repeat_interval_minutes === '' ? null : Number(form.repeat_interval_minutes) };
          await request(editingId ? `/${editingId}` : '/', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
          toast.success(editingId ? 'Campaign updated' : 'Campaign created');
          setEditorOpen(false);
          await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save campaign'); }
        finally { setSaving(false); }
      };
    
      const perform = async (campaign: Campaign, action: string) => {
        if (action === 'cancel' && !window.confirm(`Cancel â€œ${campaign.name}â€?`)) return;
        try {
          await request(`/${campaign.id}/${action}`, { method: 'POST' });
          toast.success(`Campaign ${action === 'duplicate' ? 'duplicated' : `${action}d`}`);
          await load();
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Campaign action failed'); }
      };
    
      const sendTest = async () => {
        if (!testCampaign || !testRiderId) return;
        setSaving(true);
        try {
          await request(`/${testCampaign.id}/test`, { method: 'POST', body: JSON.stringify({ rider_id: testRiderId }) });
          toast.success('Test notification sent'); setTestCampaign(null); setTestRiderId('');
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Test notification failed'); }
        finally { setSaving(false); }
      };
    
      return <div className="min-h-full bg-slate-50/60 p-4 sm:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="flex items-center gap-3 text-2xl font-black text-slate-900"><BellRing className="text-primary" />Notification Campaigns</h1>
              <p className="mt-1 text-sm font-medium text-slate-500">Create and prepare rider push campaigns. Automatic scheduling is added in Phase 2.</p></div>
            <Button onClick={openCreate} className="min-h-11"><Plus className="mr-2 h-4 w-4" />New campaign</Button>
          </div>
    
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Object.entries(stats).map(([label, value]) => <Card key={label} className="p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></Card>)}
          </div>
    
          {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Loading campaigns</span></div>
            : campaigns.length === 0 ? <Card className="p-12 text-center"><BellRing className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-700">No campaigns yet</h2><p className="mt-1 text-sm text-slate-500">Create your first rider notification campaign.</p></Card>
            : <div className="grid gap-4 xl:grid-cols-2">{campaigns.map(campaign => <Card key={campaign.id} className="p-5">
              <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{campaign.name}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{campaign.status}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{campaign.notification_title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.notification_body}</p></div><CalendarClock className="h-5 w-5 shrink-0 text-slate-400" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="font-black text-slate-400">TARGET</span><p className="mt-1 font-bold text-slate-700">{targetOptions.find(([id]) => id === campaign.target_type)?.[1]}</p></div><div><span className="font-black text-slate-400">SCHEDULE</span><p className="mt-1 font-bold text-slate-700">{campaign.start_date.slice(0, 10)} Â· {campaign.send_time.slice(0, 5)}</p></div><div><span className="font-black text-slate-400">LIMIT</span><p className="mt-1 font-bold text-slate-700">{campaign.max_sends_per_rider} per rider</p></div><div><span className="font-black text-slate-400">DESTINATION</span><p className="mt-1 font-bold capitalize text-slate-700">{campaign.destination}</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['draft', 'paused'].includes(campaign.status) && <Button size="sm" variant="outline" onClick={() => void openEdit(campaign)}>Edit</Button>}
                {['draft', 'paused'].includes(campaign.status) && <Button size="sm" onClick={() => void perform(campaign, campaign.status === 'paused' ? 'resume' : 'activate')}><Play className="mr-1 h-3.5 w-3.5" />{campaign.status === 'paused' ? 'Resume' : 'Activate'}</Button>}
                {campaign.status === 'active' && <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'pause')}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>}
                <Button size="sm" variant="outline" onClick={() => { setTestCampaign(campaign); setTestRiderId(''); }}><Send className="mr-1 h-3.5 w-3.5" />Test</Button>
                <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'duplicate')}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
                {!['cancelled', 'completed'].includes(campaign.status) && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void perform(campaign, 'cancel')}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
              </div>
            </Card>)}</div>}
        </div>
    
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? 'Edit campaign' : 'Create campaign'}</DialogTitle><DialogDescription>Configure the audience and delivery schedule in Philippine time.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name"><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} /></Field>
            <Field label="Notification title"><input value={form.notification_title} onChange={event => setForm({ ...form, notification_title: event.target.value })} maxLength={120} /></Field>
            <Field label="Message" wide><textarea value={form.notification_body} onChange={event => setForm({ ...form, notification_body: event.target.value })} maxLength={500} rows={3} /></Field>
            <Field label="Recipients"><select value={form.target_type} onChange={event => setForm({ ...form, target_type: event.target.value })}>{targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Destination"><select value={form.destination} onChange={event => setForm({ ...form, destination: event.target.value })}>{destinationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            {form.target_type === 'selected_riders' && <Field label="Select riders" wide><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">{riders.map(rider => <label key={rider.id} className="flex min-h-10 items-center gap-2 rounded px-2 hover:bg-slate-50"><input type="checkbox" checked={form.rider_ids.includes(rider.id)} onChange={event => setForm({ ...form, rider_ids: event.target.checked ? [...form.rider_ids, rider.id] : form.rider_ids.filter(id => id !== rider.id) })} /><span className="text-sm font-semibold">{rider.name}</span><span className="text-xs text-slate-400">{rider.email}</span></label>)}</div></Field>}
            <Field label="Schedule"><select value={form.schedule_type} onChange={event => setForm({ ...form, schedule_type: event.target.value as CampaignForm['schedule_type'] })}><option value="immediate">Immediate after activation</option><option value="one_time">One time</option><option value="recurring">Recurring</option></select></Field>
            <Field label="Send time (Asia/Manila)"><input type="time" value={form.send_time} onChange={event => setForm({ ...form, send_time: event.target.value })} /></Field>
            <Field label="Start date"><input type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /></Field>
            <Field label="End date (optional)"><input type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /></Field>
            {form.schedule_type === 'recurring' && <Field label="Weekdays" wide><div className="flex flex-wrap gap-2">{weekdayOptions.map(([value, label]) => <button type="button" key={value} onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(value) ? form.weekdays.filter(day => day !== value) : [...form.weekdays, value] })} className={`min-h-10 rounded-lg border px-3 text-xs font-black ${form.weekdays.includes(value) ? 'border-primary bg-primary text-white' : 'border-slate-200'}`}>{label}</button>)}</div></Field>}
            <Field label="Repeat interval in minutes (optional)"><input type="number" min={5} value={form.repeat_interval_minutes} onChange={event => setForm({ ...form, repeat_interval_minutes: event.target.value })} /></Field>
            <Field label="Maximum sends per rider"><input type="number" min={1} max={20} value={form.max_sends_per_rider} onChange={event => setForm({ ...form, max_sends_per_rider: Number(event.target.value) })} /></Field>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button disabled={saving} onClick={() => void saveCampaign()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Save changes' : 'Create campaign'}</Button></div>
        </DialogContent></Dialog>
    
        <Dialog open={Boolean(testCampaign)} onOpenChange={open => { if (!open) setTestCampaign(null); }}><DialogContent><DialogHeader><DialogTitle>Send test notification</DialogTitle><DialogDescription>Select one rider device. This creates an inbox entry marked as a test.</DialogDescription></DialogHeader><Field label="Rider"><select value={testRiderId} onChange={event => setTestRiderId(event.target.value)}><option value="">Select a rider</option>{riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name} â€” {rider.email}</option>)}</select></Field><div className="flex justify-end"><Button disabled={!testRiderId || saving} onClick={() => void sendTest()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test</Button></div></DialogContent></Dialog>
      </div>;
    }
    
    function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
      return <label className={`space-y-1.5 text-xs font-black uppercase tracking-wide text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}><span>{label}</span><div className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:p-3 [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:font-medium [&_select]:font-medium [&_textarea]:font-medium [&_input]:normal-case [&_select]:normal-case [&_textarea]:normal-case">{children}</div></label>;
    }
    
    export default NotificationCampaigns;
    ✓ • 257ms

## Activity

    $ rg -n "routePushData|routeNotificationResponse|router\.push|destination|inbox|overdue" mobile-app/services/deliveryNotifications.ts mobile-app/utils/__tests__/pushNotificationEvents.test.ts; $lines=Get-Content mobile-app/services/deliveryNotifications.ts; for($i=1;$i -le [Math]::Min(240,$lines.Length);$i++){"$i`:$($lines[$i-1])"}; Get-Content server/services/notificationCampaigns.ts
    mobile-app/services/deliveryNotifications.ts:39:    'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
    mobile-app/services/deliveryNotifications.ts:55:  return `Delivery #${id} is overdue by ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    mobile-app/services/deliveryNotifications.ts:83:  const urgent = data.type === 'delivery_overdue' || data.type === 'delivery_overdue_reminder';
    mobile-app/services/deliveryNotifications.ts:95:export function routeNotificationResponse(
    mobile-app/services/deliveryNotifications.ts:102:    // navigate reuses an existing destination when it is already in the stack.
    mobile-app/services/deliveryNotifications.ts:111:    const destination = `${encodeURIComponent(String(data.dropoff_lat))},${encodeURIComponent(String(data.dropoff_lng))}`;
    mobile-app/services/deliveryNotifications.ts:112:    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    mobile-app/services/deliveryNotifications.ts:115:  routePushData(data, router);
    mobile-app/services/deliveryNotifications.ts:118:export function routePushData(
    mobile-app/services/deliveryNotifications.ts:127:  if (requestId) router.push(`/job/${encodeURIComponent(requestId)}` as never);
    mobile-app/utils/__tests__/pushNotificationEvents.test.ts:10:  it('refreshes the rider inbox, jobs, history, and affected job detail', () => {
    1:import { Linking, Platform } from 'react-native';
    2:import { isRunningInExpoGo } from 'expo';
    3:import type { Notification } from 'expo-notifications';
    4:
    5:type ExpoNotifications = typeof import('expo-notifications');
    6:
    7:function getNotifications(): ExpoNotifications | null {
    8:  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;
    9:  return require('expo-notifications') as ExpoNotifications;
    10:}
    11:
    12:type DeliveryNotificationData = {
    13:  request_id?: string;
    14:  requestId?: string;
    15:  type?: string;
    16:  recipient_contact?: string;
    17:  dropoff_lat?: number | string;
    18:  dropoff_lng?: number | string;
    19:  conversationId?: string;
    20:};
    21:
    22:type ForegroundPushMessage = {
    23:  notification?: { title?: string | null; body?: string | null };
    24:  data?: Record<string, string | undefined>;
    25:};
    26:
    27:export async function presentForegroundPushNotification(message: ForegroundPushMessage): Promise<void> {
    28:  if (Platform.OS !== 'android') return;
    29:  const Notifications = getNotifications();
    30:  if (!Notifications) return;
    31:
    32:  const data = message.data || {};
    33:  const title = message.notification?.title;
    34:  const body = message.notification?.body;
    35:  if (!title && !body) return;
    36:
    37:  const urgentTypes = new Set([
    38:    'new_assignment', 'assignment_cancelled', 'conversation_message',
    39:    'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
    40:  ]);
    41:  const channelId = urgentTypes.has(String(data.type || '')) ? 'delivery_urgent' : 'delivery_updates';
    42:  await initializeDeliveryNotificationChannels();
    43:  await Notifications.scheduleNotificationAsync({
    44:    content: {
    45:      title: title || 'Rider update',
    46:      body: body || '',
    47:      data,
    48:      sound: 'default',
    49:    },
    50:    trigger: { channelId },
    51:  });
    52:}
    53:
    54:export function formatOverdueBody(id: string, minutes: number): string {
    55:  return `Delivery #${id} is overdue by ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    56:}
    57:
    58:export async function initializeDeliveryNotificationChannels(): Promise<void> {
    59:  if (Platform.OS !== 'android') return;
    60:  const Notifications = getNotifications();
    61:  if (!Notifications) return;
    62:  await Notifications.setNotificationChannelAsync('delivery_updates', {
    63:    name: 'Delivery updates', importance: Notifications.AndroidImportance.DEFAULT,
    64:  });
    65:  await Notifications.setNotificationChannelAsync('delivery_urgent', {
    66:    name: 'Urgent delivery alerts', importance: Notifications.AndroidImportance.HIGH,
    67:    // Android's default tone is not a packaged custom sound. Omitting sound
    68:    // uses the system default and avoids Expo looking for a file named "default".
    69:    vibrationPattern: [0, 300, 200, 300],
    70:  });
    71:  const view = { identifier: 'VIEW_TASK', buttonTitle: 'VIEW TASK', options: { opensAppToForeground: true } };
    72:  const call = { identifier: 'CALL', buttonTitle: 'CALL', options: { opensAppToForeground: false } };
    73:  const map = { identifier: 'OPEN_MAP', buttonTitle: 'OPEN MAP', options: { opensAppToForeground: false } };
    74:  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK', [view]);
    75:  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_CALL', [view, call]);
    76:  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_MAP', [view, map]);
    77:  await Notifications.setNotificationCategoryAsync('DELIVERY_TASK_CALL_MAP', [view, call, map]);
    78:}
    79:
    80:export function presentDeliveryPush(notification: Notification) {
    81:  const data = notification.request.content.data as DeliveryNotificationData;
    82:  const content = notification.request.content;
    83:  const urgent = data.type === 'delivery_overdue' || data.type === 'delivery_overdue_reminder';
    84:  return {
    85:    title: content.title || (urgent ? 'Delivery Overdue' : 'Delivery update'),
    86:    body: content.body || '',
    87:    data,
    88:    ...(Platform.OS === 'android' ? {
    89:      channelId: urgent ? 'delivery_urgent' : 'delivery_updates',
    90:      categoryIdentifier: 'DELIVERY_TASK',
    91:    } : {}),
    92:  };
    93:}
    94:
    95:export function routeNotificationResponse(
    96:  response: { actionIdentifier?: string; notification: { request: { content: { data: DeliveryNotificationData } } } },
    97:  router: { push(path: never): void; navigate(path: never): void },
    98:): void {
    99:  const data = response.notification.request.content.data || {};
    100:  if (data.conversationId && data.type === 'conversation_message') {
    101:    // A push per message tap leaves duplicate conversation routes in the stack.
    102:    // navigate reuses an existing destination when it is already in the stack.
    103:    router.navigate(`/conversation/${encodeURIComponent(data.conversationId)}` as never);
    104:    return;
    105:  }
    106:  if (response.actionIdentifier === 'CALL' && data.recipient_contact) {
    107:    void Linking.openURL(`tel:${data.recipient_contact}`);
    108:    return;
    109:  }
    110:  if (response.actionIdentifier === 'OPEN_MAP' && data.dropoff_lat != null && data.dropoff_lng != null) {
    111:    const destination = `${encodeURIComponent(String(data.dropoff_lat))},${encodeURIComponent(String(data.dropoff_lng))}`;
    112:    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`);
    113:    return;
    114:  }
    115:  routePushData(data, router);
    116:}
    117:
    118:export function routePushData(
    119:  data: DeliveryNotificationData,
    120:  router: { push(path: never): void; navigate(path: never): void },
    121:): void {
    122:  if (data.conversationId && data.type === 'conversation_message') {
    123:    router.navigate(`/conversation/${encodeURIComponent(data.conversationId)}` as never);
    124:    return;
    125:  }
    126:  const requestId = data.request_id || data.requestId;
    127:  if (requestId) router.push(`/job/${encodeURIComponent(requestId)}` as never);
    128:}
    129:
    130:const TERMINAL_DELIVERY_STATUSES = new Set(['completed', 'delivered', 'failed', 'cancelled', 'disapproved']);
    131:const ONGOING_DELIVERY_STATUSES = new Set(['in_progress', 'in_transit', 'picked_up', 'arrived', 'arrived_at_pickup', 'arrived_at_dropoff']);
    132:
    133:export async function updateActiveDeliveryNotification(
    134:  job: { request_id: string; delivery_status?: string | null },
    135:  eta?: { durationSeconds?: number } | null,
    136:): Promise<void> {
    137:  if (Platform.OS !== 'android' || !job.request_id) return;
    138:  const Notifications = getNotifications();
    139:  if (!Notifications) return;
    140:  const identifier = `active-delivery:${job.request_id}`;
    141:  const status = String(job.delivery_status || '').toLowerCase();
    142:  if (TERMINAL_DELIVERY_STATUSES.has(status)) {
    143:    await Notifications.dismissNotificationAsync(identifier);
    144:    return;
    145:  }
    146:  if (!ONGOING_DELIVERY_STATUSES.has(status)) return;
    147:  const etaMinutes = eta?.durationSeconds && eta.durationSeconds > 0
    148:    ? ` - ETA ${Math.ceil(eta.durationSeconds / 60)} min`
    149:    : '';
    150:  await Notifications.scheduleNotificationAsync({
    151:    identifier,
    152:    content: {
    153:      title: 'Rider is on the way',
    154:      body: `Delivery #${job.request_id}${etaMinutes}`,
    155:      data: { request_id: job.request_id, type: 'delivery_active' },
    156:      sticky: true,
    157:    },
    158:    trigger: { channelId: 'delivery_updates' },
    159:  });
    160:}
    161:
    162:export async function clearActiveDeliveryNotification(requestId: string): Promise<void> {
    163:  if (Platform.OS !== 'android') return;
    164:  const Notifications = getNotifications();
    165:  if (Notifications) await Notifications.dismissNotificationAsync(`active-delivery:${requestId}`);
    166:}
    167:
    168:export async function syncActiveDeliveryNotifications(jobs: Array<{ request_id: string; delivery_status?: string | null }>): Promise<void> {
    169:  if (Platform.OS !== 'android') return;
    170:  const Notifications = getNotifications();
    171:  if (!Notifications) return;
    172:  const presented = await Notifications.getPresentedNotificationsAsync();
    173:  const activeJobs = jobs.filter((job) => ONGOING_DELIVERY_STATUSES.has(String(job.delivery_status || '').toLowerCase()));
    174:  const activeIdentifiers = new Set(activeJobs.map((job) => `active-delivery:${job.request_id}`));
    175:  const visibleIdentifiers = new Set(presented
    176:    .filter((notification) => notification.request.content.data?.type === 'delivery_active')
    177:    .map((notification) => notification.request.identifier));
    178:  await Promise.all(activeJobs
    179:    .filter((job) => !visibleIdentifiers.has(`active-delivery:${job.request_id}`))
    180:    .map((job) => updateActiveDeliveryNotification(job)));
    181:  await Promise.all(presented
    182:    .filter((notification) => notification.request.content.data?.type === 'delivery_active')
    183:    .filter((notification) => !activeIdentifiers.has(notification.request.identifier))
    184:    .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)));
    185:}
    import crypto from 'crypto';
    
    export type CampaignDb = { query: (sql: string, values?: any[]) => Promise<any> };
    
    export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'] as const;
    export const CAMPAIGN_TARGETS = ['all_riders', 'selected_riders', 'no_attendance', 'present', 'absent_or_leave', 'on_duty', 'off_duty', 'active_tasks', 'overdue_tasks'] as const;
    export const CAMPAIGN_DESTINATIONS = ['dashboard', 'shift', 'today', 'overdue', 'inbox'] as const;
    
    export async function ensureNotificationCampaignTables(db: CampaignDb): Promise<void> {
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaigns (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        notification_title VARCHAR(120) NOT NULL,
        notification_body VARCHAR(500) NOT NULL,
        status ENUM('draft','scheduled','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
        target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
        schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
        start_date DATE NOT NULL,
        end_date DATE NULL,
        send_time TIME NOT NULL,
        time_zone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila',
        weekdays JSON NULL,
        repeat_interval_minutes INT NULL,
        max_sends_per_rider INT NOT NULL DEFAULT 1,
        destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
        created_by VARCHAR(191) NOT NULL,
        updated_by VARCHAR(191) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_campaign_status_start (status, start_date, send_time)
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_recipients (
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(191) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, rider_id),
        CONSTRAINT fk_campaign_recipient_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_deliveries (
        id VARCHAR(64) PRIMARY KEY,
        campaign_id VARCHAR(64) NOT NULL,
        rider_id VARCHAR(191) NOT NULL,
        scheduled_at DATETIME NOT NULL,
        attempt_number INT NOT NULL DEFAULT 1,
        status ENUM('pending','processing','sent','failed','skipped') NOT NULL DEFAULT 'pending',
        provider_message_id VARCHAR(255) NULL,
        failure_reason VARCHAR(500) NULL,
        idempotency_key VARCHAR(191) NOT NULL,
        sent_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
        INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
        CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
      )`);
    }
    
    export function newCampaignId(): string {
      return `campaign_${crypto.randomUUID()}`;
    }
    ✓ • 197ms

## Activity

    $ Get-Content server/services/shiftSchedule.ts; rg -n "notifications.*type|CREATE TABLE.*notifications|type ENUM" server -g '*.ts' -g '*.sql' | Select-Object -First 80; Get-Content mobile-app/app/'(tabs)'/_layout.tsx -TotalCount 90
    import { pool } from '../db';
    
    type Db = { query: (sql: string, values?: any[]) => Promise<any> };
    
    export type ScheduleRevision = {
      effective_date: string;
      start_time: string;
      end_time: string;
      actor_id: string;
      created_at: string;
    };
    
    export type ShiftPolicy = {
      date: string;
      startTime: string | null;
      endTime: string | null;
      cutoffAt: string | null;
      canStart: boolean;
      canWork: boolean;
      nextStartAt: string | null;
      active: boolean;
      window: 'unconfigured' | 'early' | 'open' | 'ended';
    };
    
    const phFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    
    export function getPhilippineDateTime(now: Date): { date: string; time: string } {
      const parts = Object.fromEntries(phFormatter.formatToParts(now).map(part => [part.type, part.value]));
      return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
    }
    
    export function addPhilippineDays(date: string, days: number): string {
      return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
    }
    
    export function evaluateShiftWindow(time: string, start: string, end: string): 'early' | 'open' | 'ended' {
      if (time < start) return 'early';
      if (time >= end) return 'ended';
      return 'open';
    }
    
    export function validScheduleTimes(start: unknown, end: unknown): start is string {
      return typeof start === 'string' && typeof end === 'string'
        && /^([01]\d|2[0-3]):[0-5]\d$/.test(start)
        && /^([01]\d|2[0-3]):[0-5]\d$/.test(end)
        && start < end;
    }
    
    export async function ensureShiftScheduleTables(db: Db = pool): Promise<void> {
      await db.query(`CREATE TABLE IF NOT EXISTS shift_schedule_revisions (
        effective_date DATE NOT NULL PRIMARY KEY,
        start_time CHAR(5) NOT NULL,
        end_time CHAR(5) NOT NULL,
        actor_id VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      const [columns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shift_sessions'
          AND COLUMN_NAME IN ('end_source', 'scheduled_cutoff_at')`);
      const existing = new Set((columns as any[]).map(row => row.COLUMN_NAME));
      if (!existing.has('end_source')) {
        await db.query("ALTER TABLE shift_sessions ADD COLUMN end_source VARCHAR(16) NOT NULL DEFAULT 'manual'");
      }
      if (!existing.has('scheduled_cutoff_at')) {
        await db.query('ALTER TABLE shift_sessions ADD COLUMN scheduled_cutoff_at DATETIME NULL');
      }
      const [attendanceColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance_logs'
          AND COLUMN_NAME IN ('absence_source', 'auto_absent_at', 'late_checkin_approved_by', 'late_checkin_approved_at')`);
      const existingAttendanceColumns = new Set((attendanceColumns as any[]).map(row => row.COLUMN_NAME));
      if (!existingAttendanceColumns.has('absence_source')) {
        await db.query('ALTER TABLE attendance_logs ADD COLUMN absence_source VARCHAR(32) NULL');
      }
      if (!existingAttendanceColumns.has('auto_absent_at')) {
        await db.query('ALTER TABLE attendance_logs ADD COLUMN auto_absent_at DATETIME NULL');
      }
      if (!existingAttendanceColumns.has('late_checkin_approved_by')) {
        await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_by VARCHAR(255) NULL');
      }
      if (!existingAttendanceColumns.has('late_checkin_approved_at')) {
        await db.query('ALTER TABLE attendance_logs ADD COLUMN late_checkin_approved_at DATETIME NULL');
      }
    }
    
    export async function getScheduleForDate(db: Db, date: string): Promise<ScheduleRevision | null> {
      const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
        start_time, end_time, actor_id, created_at FROM shift_schedule_revisions
        WHERE effective_date <= ? ORDER BY effective_date DESC LIMIT 1`, [date]);
      return (rows as ScheduleRevision[])[0] || null;
    }
    
    export async function getPendingSchedule(db: Db, date: string): Promise<ScheduleRevision | null> {
      const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
        start_time, end_time, actor_id, created_at FROM shift_schedule_revisions
        WHERE effective_date > ? ORDER BY effective_date ASC LIMIT 1`, [date]);
      return (rows as ScheduleRevision[])[0] || null;
    }
    
    export async function getShiftPolicy(db: Db, _riderId: string, now: Date = new Date()): Promise<ShiftPolicy> {
      const { date, time } = getPhilippineDateTime(now);
      const schedule = await getScheduleForDate(db, date);
      if (!schedule) return {
        date, startTime: null, endTime: null, cutoffAt: null,
        canStart: true, canWork: true, nextStartAt: null, active: false, window: 'unconfigured',
      };
      const window = evaluateShiftWindow(time, schedule.start_time, schedule.end_time);
      const nextDate = window === 'early' ? date : addPhilippineDays(date, 1);
      const nextSchedule = window === 'early' ? schedule : (await getScheduleForDate(db, nextDate)) || schedule;
      return {
        date, startTime: schedule.start_time, endTime: schedule.end_time,
        cutoffAt: `${date} ${schedule.end_time}:00`,
        canStart: window === 'open', canWork: window === 'open',
        nextStartAt: window === 'open' ? null : `${nextDate} ${nextSchedule.start_time}:00`,
        active: true, window,
      };
    }
    
    export async function saveNextDaySchedule(db: Db, actorId: string, startTime: string, endTime: string, now: Date = new Date()): Promise<ScheduleRevision> {
      if (!validScheduleTimes(startTime, endTime)) throw new Error('Start time must be before end time, both in HH:mm format.');
      const effectiveDate = addPhilippineDays(getPhilippineDateTime(now).date, 1);
      await db.query(`INSERT INTO shift_schedule_revisions (effective_date,start_time,end_time,actor_id)
        VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time), actor_id=VALUES(actor_id), created_at=CURRENT_TIMESTAMP`,
      [effectiveDate, startTime, endTime, actorId]);
      const [rows] = await db.query(`SELECT DATE_FORMAT(effective_date, '%Y-%m-%d') AS effective_date,
        start_time, end_time, actor_id, created_at FROM shift_schedule_revisions WHERE effective_date=?`, [effectiveDate]);
      return (rows as ScheduleRevision[])[0];
    }
    server\index.ts:213:              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\scripts\2026-10-25-notification-campaigns.sql:7:  target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
    server\scripts\2026-10-25-notification-campaigns.sql:8:  schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
    server\services\deliveryNotifications.ts:48:    'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\notificationCampaigns.ts:182:  await pool.query(`INSERT INTO notifications (id,user_id,message,type,request_id) VALUES (?,? ,?,'campaign_test',NULL)`,
    server\routes\requests.ts:663:      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:673:        'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:948:      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1022:      'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1133:          'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1331:              'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1343:                'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1360:                'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\routes\requests.ts:1458:  const notificationsToPublish: Array<{ notification: Awaited<ReturnType<typeof persistDeliveryNotification>>; push?: { title: string; body: string; data: Record<string, unknown>; channelId: 'delivery_updates' | 'delivery_urgent'; categoryId?: string; tag?: string } }> = [];
    server\routes\notifications.ts:272:      INSERT INTO notifications (id, user_id, message, type, request_id)
    server\services\proactiveOverdue.ts:59:    let notifications: Array<{ id: string; user_id: string; message: string; type: string; request_id: string }> = [];
    server\services\proactiveOverdue.ts:84:          'SELECT id FROM notifications WHERE request_id = ? AND type = ? LIMIT 1',
    server\services\proactiveOverdue.ts:135:          'INSERT INTO notifications (id, user_id, message, type, request_id) VALUES (?, ?, ?, ?, ?)',
    server\services\proactiveOverdue.ts:138:        notifications.push({ id, user_id: userId, message, type, request_id: row.request_id });
    server\services\notificationCampaigns.ts:16:    target_type ENUM('all_riders','selected_riders','no_attendance','present','absent_or_leave','on_duty','off_duty','active_tasks','overdue_tasks') NOT NULL,
    server\services\notificationCampaigns.ts:17:    schedule_type ENUM('immediate','one_time','recurring') NOT NULL DEFAULT 'one_time',
    server\services\messaging.ts:541:        INSERT INTO notifications (id, user_id, message, type, request_id)
    server\services\__tests__\deliveryNotifications.test.ts:45:      expect(notifications.every((item) => item.type === type && item.request_id === 'request-1')).toBe(true);
    import React from 'react';
    import { Tabs } from 'expo-router';
    import { Platform, StyleSheet, View } from 'react-native';
    import { useSafeAreaInsets } from 'react-native-safe-area-context';
    import { useQuery } from '@tanstack/react-query';
    import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
    import { FloatingTabBar } from '@/components/navigation/FloatingTabBar';
    import { Colors } from '@/constants/Colors';
    import { useColorScheme } from '@/hooks/use-color-scheme';
    import { useAuth } from '@/context/AuthContext';
    import { useLocation } from '@/context/LocationContext';
    import { AttendanceLockout } from '@/components/AttendanceLockout';
    import { useDashboard } from '@/hooks/data/useDashboard';
    import { getTasks } from '@/services/apiService';
    import { getRiderTaskCounts } from '@/utils/taskFilters';
    import { useMessagingUnread } from '@/hooks/useMessagingUnread';
    import { TodayRoadBackdrop } from '@/components/navigation/TodayRoadBackdrop';
    
    export default function TabLayout() {
      const colorScheme = useColorScheme();
      const insets = useSafeAreaInsets();
      const { user } = useAuth();
      const { attendanceStatus, hasOpenShift, isOnDuty, isShiftStatusReady, isNetworkReachable } = useLocation();
      const { handleLogout } = useDashboard();
      const unreadMessages = useMessagingUnread();
    
      const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', user?.id],
        queryFn: () => getTasks(user!.id),
        enabled: !!user?.id,
        refetchInterval: 30000,
      });
    
      const counts = getRiderTaskCounts(isShiftStatusReady && hasOpenShift && isOnDuty && isNetworkReachable !== false ? tasks : []);
    
      if (attendanceStatus === 'absent' || attendanceStatus === 'on_leave') {
        return (
          <AttendanceLockout
            status={attendanceStatus as any}
            onLogout={handleLogout}
          />
        );
      }
    
      return (
        <View style={styles.tabLayout}>
          <TodayRoadBackdrop />
          <Tabs
            initialRouteName="index"
            tabBar={props => (
              <FloatingTabBar
                {...props}
                badgeCounts={{
                  overdue: counts.overdue,
                  tomorrow: counts.upcoming,
                  index: counts.today,
                  inbox: unreadMessages,
                }}
              />
            )}
            screenOptions={{
              tabBarActiveTintColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint,
              headerShown: false,
              sceneStyle: { backgroundColor: 'transparent' },
              tabBarStyle: Platform.select({
                ios: {
                  height: 100 + insets.bottom,
                  backgroundColor: 'transparent',
                  borderTopWidth: 0,
                },
                default: {
                  height: 100 + insets.bottom,
                  backgroundColor: 'transparent',
                  borderTopWidth: 0,
                  elevation: 0,
                },
              }),
            }}
          >
            <Tabs.Screen name="overdue" options={{
              title: 'Overdue',
              tabBarIcon: ({ color }) => <Ionicons name="alert-circle-outline" size={23} color={color} />,
            }} />
            <Tabs.Screen name="tomorrow" options={{
              title: 'Upcoming',
              tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={23} color={color} />,
            }} />
            <Tabs.Screen name="index" options={{
              title: 'Today',
              tabBarIcon: () => <MaterialCommunityIcons name="calendar-check" size={27} color="#FFFFFF" />,
    ✓ • 171ms

## Assistant

The current mobile app already refreshes its inbox on push receipt, but campaign destinations are not routed yet. The server’s push helper also hides delivery outcomes, so I’m extending it to return a delivery result while keeping all existing callers compatible; the campaign worker can then record sent/failed accurately.

## Activity

    $ $lines=Get-Content server/routes/notifications.ts; for($i=130;$i -le 202;$i++){"$i`:$($lines[$i-1])"}
    130:});
    131:
    132:// Helper: Send Expo Push Notification
    133:export async function sendPushNotification(
    134:  userId: string,
    135:  title: string,
    136:  body: string,
    137:  data?: any,
    138:  options?: { channelId?: string; categoryId?: string; tag?: string },
    139:) {
    140:  try {
    141:    const [rows] = await pool.query('SELECT fcm_token, expo_push_token, role FROM users WHERE id = ?', [userId]) as any[];
    142:    if (rows[0]?.role !== 'rider') return;
    143:    const fcmToken = rows[0]?.fcm_token;
    144:    const token = rows[0]?.expo_push_token;
    145:    const urgentTypes = new Set([
    146:      'new_assignment', 'assignment_cancelled', 'conversation_message',
    147:      'delivery_at_risk', 'delivery_overdue', 'delivery_overdue_reminder',
    148:    ]);
    149:    const urgent = options?.channelId === 'delivery_urgent' || urgentTypes.has(String(data?.type || ''));
    150:    const notificationData = {
    151:      ...(data || {}),
    152:      eventId: data?.eventId || data?.notificationId || data?.messageId || data?.request_id || data?.requestId || data?.conversationId || `push-${Date.now()}`,
    153:    };
    154:
    155:    if (fcmToken) {
    156:      try {
    157:        await sendFcmNotification(fcmToken, {
    158:          title,
    159:          body,
    160:          data: notificationData,
    161:          channelId: urgent ? 'delivery_urgent' : options?.channelId || 'delivery_updates',
    162:          categoryId: options?.categoryId,
    163:          tag: options?.tag,
    164:          priority: urgent ? 'high' : 'normal',
    165:        });
    166:      } catch (error) {
    167:        if (isPermanentFcmTokenError(error)) {
    168:          await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, fcmToken]);
    169:        }
    170:        console.error('[FCM] Push delivery failed.');
    171:      }
    172:      return;
    173:    }
    174:
    175:    if (!token || !Expo.isExpoPushToken(token)) {
    176:      console.log(`âš ï¸ Invalid or missing Expo Push Token for user ${userId}`);
    177:      return;
    178:    }
    179:
    180:    const messages: any[] = [{
    181:      to: token,
    182:      sound: 'default',
    183:      title,
    184:      body,
    185:      data: notificationData,
    186:      priority: options?.channelId === 'delivery_updates' ? 'default' : 'high',
    187:      channelId: options?.channelId || 'default',
    188:      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    189:      ...(options?.tag ? { tag: options.tag } : {}),
    190:    }];
    191:
    192:    const chunks = expo.chunkPushNotifications(messages);
    193:    for (const chunk of chunks) {
    194:      await expo.sendPushNotificationsAsync(chunk);
    195:    }
    196:    console.log(`ðŸš€ Push notification sent to user ${userId}`);
    197:  } catch (err) {
    198:    console.error('[PUSH] Provider delivery failed.');
    199:  }
    200:}
    201:
    202:// Register Push Token
    ✓ • 90ms

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notifications.ts
    @@ -138,6 +138,6 @@
       options?: { channelId?: string; categoryId?: string; tag?: string },
    -) {
    +): Promise<{ sent: boolean; providerMessageId?: string; reason?: string }> {
       try {
         const [rows] = await pool.query('SELECT fcm_token, expo_push_token, role FROM users WHERE id = ?', [userId]) as any[];
    -    if (rows[0]?.role !== 'rider') return;
    +    if (rows[0]?.role !== 'rider') return { sent: false, reason: 'Recipient is not a rider' };
         const fcmToken = rows[0]?.fcm_token;
    @@ -156,3 +156,3 @@
           try {
    -        await sendFcmNotification(fcmToken, {
    +        const providerMessageId = await sendFcmNotification(fcmToken, {
               title,
    @@ -165,2 +165,3 @@
             });
    +        return { sent: true, providerMessageId };
           } catch (error) {
    @@ -170,4 +171,4 @@
             console.error('[FCM] Push delivery failed.');
    +        return { sent: false, reason: error instanceof Error ? error.message : 'FCM delivery failed' };
           }
    -      return;
         }
    @@ -176,3 +177,3 @@
           console.log(`⚠️ Invalid or missing Expo Push Token for user ${userId}`);
    -      return;
    +      return { sent: false, reason: 'No registered push token' };
         }
    @@ -191,11 +192,15 @@
     
    -    const chunks = expo.chunkPushNotifications(messages);
    -    for (const chunk of chunks) {
    -      await expo.sendPushNotificationsAsync(chunk);
    -    }
    +    const chunks = expo.chunkPushNotifications(messages);
    +    let providerMessageId: string | undefined;
    +    for (const chunk of chunks) {
    +      const tickets = await expo.sendPushNotificationsAsync(chunk);
    +      providerMessageId ||= tickets.find(ticket => ticket.status === 'ok' && ticket.id)?.id;
    +    }
    +    return { sent: true, providerMessageId };
         console.log(`🚀 Push notification sent to user ${userId}`);
    -  } catch (err) {
    -    console.error('[PUSH] Provider delivery failed.');
    -  }
    -}
    +  } catch (err) {
    +    console.error('[PUSH] Provider delivery failed.');
    +    return { sent: false, reason: err instanceof Error ? err.message : 'Push provider delivery failed' };
    +  }
    +}
     

## Activity

    $ $lines=Get-Content server/routes/notifications.ts; for($i=150;$i -le 205;$i++){"$i`:$($lines[$i-1])"}
    150:    const notificationData = {
    151:      ...(data || {}),
    152:      eventId: data?.eventId || data?.notificationId || data?.messageId || data?.request_id || data?.requestId || data?.conversationId || `push-${Date.now()}`,
    153:    };
    154:
    155:    if (fcmToken) {
    156:      try {
    157:        const providerMessageId = await sendFcmNotification(fcmToken, {
    158:          title,
    159:          body,
    160:          data: notificationData,
    161:          channelId: urgent ? 'delivery_urgent' : options?.channelId || 'delivery_updates',
    162:          categoryId: options?.categoryId,
    163:          tag: options?.tag,
    164:          priority: urgent ? 'high' : 'normal',
    165:        });
    166:        return { sent: true, providerMessageId };
    167:      } catch (error) {
    168:        if (isPermanentFcmTokenError(error)) {
    169:          await pool.query('UPDATE users SET fcm_token = NULL WHERE id = ? AND fcm_token = ?', [userId, fcmToken]);
    170:        }
    171:        console.error('[FCM] Push delivery failed.');
    172:        return { sent: false, reason: error instanceof Error ? error.message : 'FCM delivery failed' };
    173:      }
    174:    }
    175:
    176:    if (!token || !Expo.isExpoPushToken(token)) {
    177:      console.log(`âš ï¸ Invalid or missing Expo Push Token for user ${userId}`);
    178:      return { sent: false, reason: 'No registered push token' };
    179:    }
    180:
    181:    const messages: any[] = [{
    182:      to: token,
    183:      sound: 'default',
    184:      title,
    185:      body,
    186:      data: notificationData,
    187:      priority: options?.channelId === 'delivery_updates' ? 'default' : 'high',
    188:      channelId: options?.channelId || 'default',
    189:      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    190:      ...(options?.tag ? { tag: options.tag } : {}),
    191:    }];
    192:
    193:    const chunks = expo.chunkPushNotifications(messages);
    194:    let providerMessageId: string | undefined;
    195:    for (const chunk of chunks) {
    196:      const tickets = await expo.sendPushNotificationsAsync(chunk);
    197:      providerMessageId ||= tickets.find(ticket => ticket.status === 'ok' && ticket.id)?.id;
    198:    }
    199:    return { sent: true, providerMessageId };
    200:    console.log(`ðŸš€ Push notification sent to user ${userId}`);
    201:  } catch (err) {
    202:    console.error('[PUSH] Provider delivery failed.');
    203:    return { sent: false, reason: err instanceof Error ? err.message : 'Push provider delivery failed' };
    204:  }
    205:}
    ✓ • 132ms

## Activity

    file changes: Completed · 2 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\scripts\2026-10-25-notification-campaigns.sql
    @@ -16,2 +16,5 @@
       destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
    +  next_run_at DATETIME NULL,
    +  last_run_at DATETIME NULL,
    +  completed_at DATETIME NULL,
       created_by VARCHAR(191) NOT NULL,
    @@ -42,2 +45,4 @@
       sent_at DATETIME NULL,
    +  action_type VARCHAR(32) NULL,
    +  acted_at DATETIME NULL,
       created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    @@ -47 +52,10 @@
     );
    +
    +CREATE TABLE IF NOT EXISTS notification_campaign_worker_state (
    +  worker_key VARCHAR(64) PRIMARY KEY,
    +  last_started_at DATETIME NULL,
    +  last_completed_at DATETIME NULL,
    +  last_status VARCHAR(16) NOT NULL DEFAULT 'idle',
    +  last_error VARCHAR(500) NULL,
    +  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    +);
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaigns.ts
    @@ -1,2 +1,3 @@
     import crypto from 'crypto';
    +import { addPhilippineDays, getPhilippineDateTime } from './shiftSchedule';
     
    @@ -25,2 +26,5 @@
         destination ENUM('dashboard','shift','today','overdue','inbox') NOT NULL DEFAULT 'dashboard',
    +    next_run_at DATETIME NULL,
    +    last_run_at DATETIME NULL,
    +    completed_at DATETIME NULL,
         created_by VARCHAR(191) NOT NULL,
    @@ -49,2 +53,4 @@
         sent_at DATETIME NULL,
    +    action_type VARCHAR(32) NULL,
    +    acted_at DATETIME NULL,
         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    @@ -54,2 +60,23 @@
       )`);
    +  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_worker_state (
    +    worker_key VARCHAR(64) PRIMARY KEY,
    +    last_started_at DATETIME NULL,
    +    last_completed_at DATETIME NULL,
    +    last_status VARCHAR(16) NOT NULL DEFAULT 'idle',
    +    last_error VARCHAR(500) NULL,
    +    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    +  )`);
    +  const [campaignColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    +    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaigns'
    +      AND COLUMN_NAME IN ('next_run_at','last_run_at','completed_at')`);
    +  const existingCampaignColumns = new Set((campaignColumns as any[]).map(row => row.COLUMN_NAME));
    +  if (!existingCampaignColumns.has('next_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN next_run_at DATETIME NULL');
    +  if (!existingCampaignColumns.has('last_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN last_run_at DATETIME NULL');
    +  if (!existingCampaignColumns.has('completed_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN completed_at DATETIME NULL');
    +  const [deliveryColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    +    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaign_deliveries'
    +      AND COLUMN_NAME IN ('action_type','acted_at')`);
    +  const existingDeliveryColumns = new Set((deliveryColumns as any[]).map(row => row.COLUMN_NAME));
    +  if (!existingDeliveryColumns.has('action_type')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN action_type VARCHAR(32) NULL');
    +  if (!existingDeliveryColumns.has('acted_at')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN acted_at DATETIME NULL');
     }
    @@ -59 +86,54 @@
     }
    +
    +export type CampaignSchedule = {
    +  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date?: string | null;
    +  send_time: string; weekdays?: number[] | string | null; repeat_interval_minutes?: number | null; max_sends_per_rider: number;
    +};
    +
    +const mysqlNow = (now: Date) => {
    +  const ph = getPhilippineDateTime(now);
    +  return `${ph.date} ${ph.time}:00`;
    +};
    +const weekday = (date: string) => {
    +  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    +  return day === 0 ? 7 : day;
    +};
    +const parseWeekdays = (value: CampaignSchedule['weekdays']): number[] => {
    +  if (Array.isArray(value)) return value;
    +  if (typeof value !== 'string') return [];
    +  try { return JSON.parse(value); } catch { return []; }
    +};
    +
    +export function getInitialCampaignRun(campaign: CampaignSchedule, now: Date = new Date()): string | null {
    +  if (campaign.schedule_type === 'immediate') return mysqlNow(now);
    +  const current = getPhilippineDateTime(now);
    +  if (campaign.schedule_type === 'one_time') {
    +    const run = `${campaign.start_date} ${campaign.send_time.slice(0, 5)}:00`;
    +    return run >= mysqlNow(now) ? run : null;
    +  }
    +  const days = new Set(parseWeekdays(campaign.weekdays));
    +  let date = campaign.start_date > current.date ? campaign.start_date : current.date;
    +  for (let offset = 0; offset < 370; offset++, date = addPhilippineDays(date, 1)) {
    +    if (campaign.end_date && date > campaign.end_date) return null;
    +    const run = `${date} ${campaign.send_time.slice(0, 5)}:00`;
    +    if (days.has(weekday(date)) && run >= mysqlNow(now)) return run;
    +  }
    +  return null;
    +}
    +
    +export function getNextCampaignRun(campaign: CampaignSchedule, previousRun: string, runsOnDate: number): string | null {
    +  const date = previousRun.slice(0, 10);
    +  if (campaign.repeat_interval_minutes && runsOnDate < campaign.max_sends_per_rider) {
    +    const utc = Date.parse(`${previousRun.replace(' ', 'T')}+08:00`) + campaign.repeat_interval_minutes * 60_000;
    +    const next = getPhilippineDateTime(new Date(utc));
    +    return `${next.date} ${next.time}:00`;
    +  }
    +  if (campaign.schedule_type !== 'recurring') return null;
    +  const days = new Set(parseWeekdays(campaign.weekdays));
    +  let nextDate = addPhilippineDays(date, 1);
    +  for (let offset = 0; offset < 370; offset++, nextDate = addPhilippineDays(nextDate, 1)) {
    +    if (campaign.end_date && nextDate > campaign.end_date) return null;
    +    if (days.has(weekday(nextDate))) return `${nextDate} ${campaign.send_time.slice(0, 5)}:00`;
    +  }
    +  return null;
    +}

## Activity

    file changes: Completed · 2 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\scripts\2026-10-25-notification-campaigns.sql
    @@ -42,2 +42,3 @@
       provider_message_id VARCHAR(255) NULL,
    +  notification_id VARCHAR(64) NULL,
       failure_reason VARCHAR(500) NULL,
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaigns.ts
    @@ -50,2 +50,3 @@
         provider_message_id VARCHAR(255) NULL,
    +    notification_id VARCHAR(64) NULL,
         failure_reason VARCHAR(500) NULL,
    @@ -77,3 +78,3 @@
         WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaign_deliveries'
    -      AND COLUMN_NAME IN ('action_type','acted_at')`);
    +      AND COLUMN_NAME IN ('notification_id','action_type','acted_at')`);
       const existingDeliveryColumns = new Set((deliveryColumns as any[]).map(row => row.COLUMN_NAME));
    @@ -139 +140,2 @@
     }
    +  if (!existingDeliveryColumns.has('notification_id')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN notification_id VARCHAR(64) NULL');

## Activity

    file changes: Completed · 1 changes
    Add: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaignWorker.ts
    import crypto from 'crypto';
    import type { Server } from 'socket.io';
    import { pool } from '../db';
    import { sendPushNotification } from '../routes/notifications';
    import { getNextCampaignRun } from './notificationCampaigns';
    import { getPhilippineDateTime } from './shiftSchedule';
    
    type Campaign = {
      id: string; notification_title: string; notification_body: string; target_type: string;
      schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string | null;
      send_time: string; weekdays: string | number[] | null; repeat_interval_minutes: number | null;
      max_sends_per_rider: number; destination: string; next_run_at: string;
    };
    
    const activeTask = `EXISTS (SELECT 1 FROM delivery_requests dr WHERE dr.assigned_rider_id=u.id
      AND dr.delivery_status NOT IN ('completed','delivered','failed','cancelled','disapproved'))`;
    
    function eligibilitySql(target: string): string {
      switch (target) {
        case 'selected_riders': return 'EXISTS (SELECT 1 FROM notification_campaign_recipients cr WHERE cr.campaign_id=? AND cr.rider_id=u.id)';
        case 'no_attendance': return 'NOT EXISTS (SELECT 1 FROM attendance_logs al WHERE al.rider_id=u.id AND al.date=?)';
        case 'present': return "EXISTS (SELECT 1 FROM attendance_logs al WHERE al.rider_id=u.id AND al.date=? AND al.status='present')";
        case 'absent_or_leave': return "EXISTS (SELECT 1 FROM attendance_logs al WHERE al.rider_id=u.id AND al.date=? AND al.status IN ('absent','on_leave'))";
        case 'on_duty': return 'u.is_on_duty=TRUE';
        case 'off_duty': return 'u.is_on_duty=FALSE';
        case 'active_tasks': return activeTask;
        case 'overdue_tasks': return `${activeTask} AND EXISTS (SELECT 1 FROM delivery_requests odr WHERE odr.assigned_rider_id=u.id
          AND odr.delivery_status NOT IN ('completed','delivered','failed','cancelled','disapproved')
          AND (odr.delivery_date < ? OR odr.scheduled_end_at < NOW()))`;
        default: return '1=1';
      }
    }
    
    async function eligibleRiders(campaign: Campaign, scheduledAt: string): Promise<Array<{ id: string; name: string }>> {
      const date = scheduledAt.slice(0, 10);
      const predicate = eligibilitySql(campaign.target_type);
      const predicateParams = campaign.target_type === 'selected_riders' ? [campaign.id]
        : ['no_attendance', 'present', 'absent_or_leave', 'overdue_tasks'].includes(campaign.target_type) ? [date] : [];
      const [rows] = await pool.query(`SELECT u.id,u.name FROM users u WHERE u.role='rider' AND u.status <> 'inactive'
        AND ${predicate}
        AND (SELECT COUNT(*) FROM notification_campaign_deliveries d WHERE d.campaign_id=? AND d.rider_id=u.id
          AND DATE(d.scheduled_at)=? AND d.status IN ('processing','sent','failed')) < ?
        ORDER BY u.id LIMIT 2000`, [...predicateParams, campaign.id, date, campaign.max_sends_per_rider]);
      return rows as Array<{ id: string; name: string }>;
    }
    
    async function reserveDelivery(campaign: Campaign, rider: { id: string }, scheduledAt: string): Promise<{ deliveryId: string; notificationId: string } | null> {
      const conn = await pool.getConnection();
      const deliveryId = `campaign_delivery_${crypto.randomUUID()}`;
      const notificationId = `notif_${crypto.randomUUID()}`;
      const idempotencyKey = `${campaign.id}:${rider.id}:${scheduledAt}`;
      try {
        await conn.beginTransaction();
        await conn.query(`INSERT INTO notification_campaign_deliveries
          (id,campaign_id,rider_id,scheduled_at,attempt_number,status,notification_id,idempotency_key)
          VALUES (?,?,?,?,1,'processing',?,?)`, [deliveryId, campaign.id, rider.id, scheduledAt, notificationId, idempotencyKey]);
        await conn.query(`INSERT INTO notifications (id,user_id,message,type,request_id)
          VALUES (?,?,?,'campaign',NULL)`, [notificationId, rider.id, campaign.notification_body]);
        await conn.commit();
        return { deliveryId, notificationId };
      } catch (error: any) {
        await conn.rollback();
        if (error?.code === 'ER_DUP_ENTRY') return null;
        throw error;
      } finally { conn.release(); }
    }
    
    async function deliver(campaign: Campaign, riderId: string, deliveryId: string, notificationId: string, io?: Server) {
      io?.to(riderId).emit('notification-added', {
        id: notificationId, user_id: riderId, message: campaign.notification_body, type: 'campaign', campaign_id: campaign.id,
      });
      const result = await sendPushNotification(riderId, campaign.notification_title, campaign.notification_body, {
        type: 'campaign', campaignId: campaign.id, notificationId, destination: campaign.destination,
      }, { channelId: 'delivery_updates', tag: `campaign:${campaign.id}` });
      await pool.query(`UPDATE notification_campaign_deliveries SET status=?,provider_message_id=?,failure_reason=?,sent_at=? WHERE id=?`, [
        result.sent ? 'sent' : 'failed', result.providerMessageId || null, result.reason?.slice(0, 500) || null,
        result.sent ? new Date() : null, deliveryId,
      ]);
    }
    
    function runNumber(campaign: Campaign, scheduledAt: string): number {
      if (!campaign.repeat_interval_minutes) return 1;
      const base = Date.parse(`${scheduledAt.slice(0, 10)}T${campaign.send_time.slice(0, 5)}:00+08:00`);
      const actual = Date.parse(`${scheduledAt.replace(' ', 'T')}+08:00`);
      return Math.max(1, Math.floor((actual - base) / (campaign.repeat_interval_minutes * 60_000)) + 1);
    }
    
    export async function processDueNotificationCampaigns(io?: Server, now: Date = new Date()): Promise<number> {
      const ph = getPhilippineDateTime(now);
      const localNow = `${ph.date} ${ph.time}:00`;
      const [rows] = await pool.query(`SELECT * FROM notification_campaigns
        WHERE status='active' AND next_run_at IS NOT NULL AND next_run_at <= ? ORDER BY next_run_at LIMIT 25`, [localNow]);
      let processed = 0;
      for (const campaign of rows as Campaign[]) {
        const scheduledAt = String(campaign.next_run_at).slice(0, 19);
        const riders = await eligibleRiders(campaign, scheduledAt);
        for (const rider of riders) {
          const reservation = await reserveDelivery(campaign, rider, scheduledAt);
          if (!reservation) continue;
          await deliver(campaign, rider.id, reservation.deliveryId, reservation.notificationId, io);
        }
        const nextRun = getNextCampaignRun(campaign, scheduledAt, runNumber(campaign, scheduledAt));
        await pool.query(`UPDATE notification_campaigns SET last_run_at=?,next_run_at=?,status=?,completed_at=?
          WHERE id=? AND status='active' AND next_run_at=?`, [scheduledAt, nextRun,
          nextRun ? 'active' : 'completed', nextRun ? null : localNow, campaign.id, campaign.next_run_at]);
        processed++;
      }
      return processed;
    }
    
    export async function retryFailedCampaignDeliveries(io?: Server): Promise<number> {
      const [rows] = await pool.query(`SELECT d.id delivery_id,d.rider_id,d.notification_id,d.attempt_number,
        c.id,c.notification_title,c.notification_body,c.destination
        FROM notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
        WHERE d.status='failed' AND d.attempt_number < 3 AND d.created_at <= DATE_SUB(NOW(),INTERVAL d.attempt_number MINUTE)
        ORDER BY d.created_at LIMIT 50`);
      for (const row of rows as any[]) {
        const [result]: any = await pool.query(`UPDATE notification_campaign_deliveries SET status='processing',attempt_number=attempt_number+1
          WHERE id=? AND status='failed'`, [row.delivery_id]);
        if (!result.affectedRows) continue;
        await deliver(row as Campaign, row.rider_id, row.delivery_id, row.notification_id, io);
      }
      return (rows as any[]).length;
    }
    
    export async function reconcileCampaignActions(): Promise<void> {
      await pool.query(`UPDATE notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
        JOIN attendance_logs al ON al.rider_id=d.rider_id AND al.check_in_time >= d.sent_at
        SET d.action_type=CASE WHEN al.status='present' THEN 'attendance_present' ELSE CONCAT('attendance_',al.status) END,
            d.acted_at=al.check_in_time
        WHERE d.status='sent' AND d.acted_at IS NULL AND c.destination IN ('dashboard','shift')`);
      await pool.query(`UPDATE notification_campaign_deliveries d JOIN notification_campaigns c ON c.id=d.campaign_id
        JOIN delivery_requests dr ON dr.assigned_rider_id=d.rider_id AND dr.delivery_status IN ('completed','delivered') AND dr.updated_at >= d.sent_at
        SET d.action_type='task_completed',d.acted_at=dr.updated_at
        WHERE d.status='sent' AND d.acted_at IS NULL AND c.destination IN ('today','overdue')`);
    }
    
    export function startNotificationCampaignWorker(io?: Server): () => void {
      let running = false;
      const run = async () => {
        if (running) return;
        running = true;
        await pool.query(`INSERT INTO notification_campaign_worker_state (worker_key,last_started_at,last_status)
          VALUES ('campaign_dispatch',NOW(),'running') ON DUPLICATE KEY UPDATE last_started_at=NOW(),last_status='running',last_error=NULL`);
        try {
          await processDueNotificationCampaigns(io);
          await retryFailedCampaignDeliveries(io);
          await reconcileCampaignActions();
          await pool.query("DELETE FROM notification_campaign_deliveries WHERE created_at < DATE_SUB(NOW(),INTERVAL 180 DAY)");
          await pool.query(`UPDATE notification_campaign_worker_state SET last_completed_at=NOW(),last_status='healthy',last_error=NULL
            WHERE worker_key='campaign_dispatch'`);
        } catch (error) {
          console.error('[NOTIFICATION CAMPAIGNS] Worker pass failed:', error);
          await pool.query(`UPDATE notification_campaign_worker_state SET last_completed_at=NOW(),last_status='error',last_error=?
            WHERE worker_key='campaign_dispatch'`, [String(error instanceof Error ? error.message : error).slice(0, 500)]).catch(() => undefined);
        } finally { running = false; }
      };
      void run();
      const timer = setInterval(() => void run(), 60_000);
      timer.unref?.();
      return () => clearInterval(timer);
    }

## Activity

    file changes: Completed · 3 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\index.ts
    @@ -41,2 +41,3 @@
     import { ensureNotificationCampaignTables } from './services/notificationCampaigns';
    +import { startNotificationCampaignWorker } from './services/notificationCampaignWorker';
     import { getJwtSecret, validateProductionSecurityConfig } from './config/security';
    @@ -568,2 +569,3 @@
     ensureNotificationCampaignTables(pool)
    +  .then(() => startNotificationCampaignWorker(io))
       .catch((error) => console.error('[NOTIFICATION CAMPAIGNS] Startup initialization failed:', error));
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    @@ -6,3 +6,3 @@
     import { logAction } from '../services/auditLogger';
    -import { CAMPAIGN_DESTINATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TARGETS, newCampaignId } from '../services/notificationCampaigns';
    +import { CAMPAIGN_DESTINATIONS, CAMPAIGN_STATUSES, CAMPAIGN_TARGETS, getInitialCampaignRun, newCampaignId } from '../services/notificationCampaigns';
     import { sendPushNotification } from './notifications';
    @@ -53,3 +53,7 @@
         (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
    -    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
    +    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count,
    +    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='sent') sent_count,
    +    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='failed') failed_count,
    +    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='skipped') skipped_count,
    +    (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.acted_at IS NOT NULL) acted_count
         FROM notification_campaigns c WHERE c.id=? LIMIT 1`, [id]);
    @@ -68,3 +72,3 @@
     router.get('/riders', async (_req: AuthRequest, res: Response) => {
    -  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND status <> 'inactive' ORDER BY name");
    +  const [rows] = await pool.query("SELECT id, name, email FROM users WHERE role='rider' AND (status IS NULL OR status <> 'inactive') ORDER BY name");
       res.json(rows);
    @@ -72,2 +76,7 @@
     
    +router.get('/worker-health', async (_req: AuthRequest, res: Response) => {
    +  const [rows]: any = await pool.query("SELECT * FROM notification_campaign_worker_state WHERE worker_key='campaign_dispatch' LIMIT 1");
    +  res.json(rows[0] || { worker_key: 'campaign_dispatch', last_status: 'not_started' });
    +});
    +
     router.get('/', async (_req: AuthRequest, res: Response) => {
    @@ -76,3 +85,7 @@
           (SELECT COUNT(*) FROM notification_campaign_recipients cr WHERE cr.campaign_id=c.id) recipient_count,
    -      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count
    +      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id) delivery_count,
    +      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='sent') sent_count,
    +      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='failed') failed_count,
    +      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.status='skipped') skipped_count,
    +      (SELECT COUNT(*) FROM notification_campaign_deliveries cd WHERE cd.campaign_id=c.id AND cd.acted_at IS NOT NULL) acted_count
           FROM notification_campaigns c ORDER BY c.updated_at DESC`);
    @@ -197,6 +210,9 @@
         if (!transition.from.includes(previous.status)) return res.status(409).json({ error: `Cannot ${action} a ${previous.status} campaign` });
    -    await pool.query('UPDATE notification_campaigns SET status=?, updated_by=? WHERE id=?', [transition.to, req.user!.id, id]);
    +    const nextRun = ['activate', 'resume'].includes(action) ? getInitialCampaignRun(previous) : null;
    +    if (['activate', 'resume'].includes(action) && !nextRun) return res.status(409).json({ error: 'This campaign has no future scheduled delivery' });
    +    await pool.query('UPDATE notification_campaigns SET status=?,next_run_at=?,completed_at=NULL,updated_by=? WHERE id=?',
    +      [transition.to, nextRun, req.user!.id, id]);
         const updated = await getCampaign(id);
         const auditAction = action === 'cancel' ? 'notification_campaign_cancelled' : `notification_campaign_${action}d`;
    -    await audit(req, auditAction, id, { status: previous.status }, { status: transition.to });
    +    await audit(req, auditAction, id, { status: previous.status }, { status: transition.to, next_run_at: nextRun });
         res.json(updated);
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaignWorker.ts
    @@ -38,3 +38,3 @@
         : ['no_attendance', 'present', 'absent_or_leave', 'overdue_tasks'].includes(campaign.target_type) ? [date] : [];
    -  const [rows] = await pool.query(`SELECT u.id,u.name FROM users u WHERE u.role='rider' AND u.status <> 'inactive'
    +  const [rows] = await pool.query(`SELECT u.id,u.name FROM users u WHERE u.role='rider' AND (u.status IS NULL OR u.status <> 'inactive')
         AND ${predicate}

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notificationCampaigns.ts
    @@ -47,2 +47,6 @@
         delivery_count: Number(row.delivery_count || 0),
    +    sent_count: Number(row.sent_count || 0),
    +    failed_count: Number(row.failed_count || 0),
    +    skipped_count: Number(row.skipped_count || 0),
    +    acted_count: Number(row.acted_count || 0),
       };

## Activity

    $ rg -n "routePushData|routeNotificationResponse" mobile-app -g '*.test.ts' -g '*.test.tsx'; rg -n "deliveryNotifications" mobile-app/services/__tests__ mobile-app/utils/__tests__
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:29:  routeNotificationResponse: jest.fn(),
    mobile-app\hooks\__tests__\use-push-notifications.test.tsx:30:  routePushData: jest.fn((data, router) => {
    mobile-app\services\__tests__\deliveryNotifications.test.ts:18:import { formatOverdueBody, routeNotificationResponse, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';
    mobile-app\services\__tests__\deliveryNotifications.test.ts:27:    routeNotificationResponse({ notification: { request: { content: { data: { request_id: 'req_123' } } } } } as any, router as any);
    mobile-app\services\__tests__\deliveryNotifications.test.ts:37:    routeNotificationResponse(response, router as any);
    mobile-app\services\__tests__\deliveryNotifications.test.ts:38:    routeNotificationResponse(response, router as any);
    mobile-app\services\__tests__\deliveryNotifications.test.ts:47:    routeNotificationResponse({
    mobile-app\services\__tests__\deliveryNotifications.test.ts:56:    routeNotificationResponse({ actionIdentifier: 'CALL', notification: { request: { content: { data: { request_id: 'req_123', recipient_contact: '+639123456789' } } } } } as any, router as any);
    mobile-app\services\__tests__\deliveryNotifications.test.ts:57:    routeNotificationResponse({ actionIdentifier: 'OPEN_MAP', notification: { request: { content: { data: { request_id: 'req_123', dropoff_lat: 14.6, dropoff_lng: 121.0 } } } } } as any, router as any);
    mobile-app/services/__tests__\deliveryNotifications.test.ts:18:import { formatOverdueBody, routeNotificationResponse, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';
    mobile-app/services/__tests__\deliveryNotifications.expo-go.test.ts:12:    const deliveryNotifications = require('../deliveryNotifications');
    mobile-app/services/__tests__\deliveryNotifications.expo-go.test.ts:14:    await expect(deliveryNotifications.initializeDeliveryNotificationChannels()).resolves.toBeUndefined();
    mobile-app/services/__tests__\deliveryNotifications.expo-go.test.ts:15:    await expect(deliveryNotifications.updateActiveDeliveryNotification({
    mobile-app/services/__tests__\deliveryNotifications.expo-go.test.ts:18:    await expect(deliveryNotifications.syncActiveDeliveryNotifications([])).resolves.toBeUndefined();
    mobile-app/services/__tests__\deliveryNotifications.expo-go.test.ts:19:    await expect(deliveryNotifications.clearActiveDeliveryNotification('request-1')).resolves.toBeUndefined();
    ✓ • 82ms

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\services\deliveryNotifications.ts
    @@ -19,2 +19,4 @@
       conversationId?: string;
    +  destination?: string;
    +  campaignId?: string;
     };
    @@ -125,2 +127,9 @@
       }
    +  if (data.type === 'campaign' || data.type === 'campaign_test') {
    +    const routes: Record<string, string> = {
    +      dashboard: '/(tabs)', shift: '/(tabs)', today: '/(tabs)', overdue: '/(tabs)/overdue', inbox: '/(tabs)/inbox',
    +    };
    +    router.navigate((routes[String(data.destination || '')] || '/(tabs)') as never);
    +    return;
    +  }
       const requestId = data.request_id || data.requestId;

## Activity

    $ Get-Content mobile-app/services/__tests__/deliveryNotifications.test.ts -TotalCount 80
    jest.mock('react-native', () => ({
      Platform: { OS: 'android' },
      Linking: { openURL: jest.fn() },
    }));
    jest.mock('expo', () => ({ isRunningInExpoGo: () => false }));
    
    jest.mock('expo-notifications', () => ({
      AndroidImportance: { DEFAULT: 3, HIGH: 4 },
      setNotificationChannelAsync: jest.fn(),
      setNotificationCategoryAsync: jest.fn(),
      scheduleNotificationAsync: jest.fn(),
      dismissNotificationAsync: jest.fn(),
      getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
    }));
    
    import * as Notifications from 'expo-notifications';
    import { Linking } from 'react-native';
    import { formatOverdueBody, routeNotificationResponse, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';
    
    beforeEach(() => jest.clearAllMocks());
    
    describe('delivery notifications', () => {
      it('formats overdue minutes and routes legacy request_id payloads', () => {
        expect(formatOverdueBody('123', 1)).toBe('Delivery #123 is overdue by 1 minute.');
        expect(formatOverdueBody('123', 3)).toBe('Delivery #123 is overdue by 3 minutes.');
        const router = { push: jest.fn() };
        routeNotificationResponse({ notification: { request: { content: { data: { request_id: 'req_123' } } } } } as any, router as any);
        expect(router.push).toHaveBeenCalledWith('/job/req_123');
      });
    
      it('navigates to a conversation notification without stacking duplicate inbox destinations', () => {
        const router = { push: jest.fn(), navigate: jest.fn() };
        const response = {
          notification: { request: { content: { data: { type: 'conversation_message', conversationId: 'conversation-1' } } } },
        } as any;
    
        routeNotificationResponse(response, router as any);
        routeNotificationResponse(response, router as any);
    
        expect(router.navigate).toHaveBeenCalledTimes(2);
        expect(router.navigate).toHaveBeenCalledWith('/conversation/conversation-1');
        expect(router.push).not.toHaveBeenCalled();
      });
    
      it('routes direct FCM payloads with camel-case request IDs to the job screen', () => {
        const router = { push: jest.fn(), navigate: jest.fn() };
        routeNotificationResponse({
          notification: { request: { content: { data: { requestId: 'job-22', eventId: 'event-22' } } } },
        } as any, router as any);
    
        expect(router.push).toHaveBeenCalledWith('/job/job-22');
      });
    
      it('routes CALL and OPEN MAP only when the payload has the required destination data', () => {
        const router = { push: jest.fn() };
        routeNotificationResponse({ actionIdentifier: 'CALL', notification: { request: { content: { data: { request_id: 'req_123', recipient_contact: '+639123456789' } } } } } as any, router as any);
        routeNotificationResponse({ actionIdentifier: 'OPEN_MAP', notification: { request: { content: { data: { request_id: 'req_123', dropoff_lat: 14.6, dropoff_lng: 121.0 } } } } } as any, router as any);
        expect(Linking.openURL).toHaveBeenNthCalledWith(1, 'tel:+639123456789');
        expect(Linking.openURL).toHaveBeenNthCalledWith(2, 'https://www.google.com/maps/dir/?api=1&destination=14.6,121');
        expect(router.push).not.toHaveBeenCalled();
      });
    
      it('creates the urgent and standard Android channels', async () => {
        await initializeDeliveryNotificationChannels();
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_updates', expect.objectContaining({ importance: Notifications.AndroidImportance.DEFAULT }));
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_urgent', expect.not.objectContaining({ sound: 'default' }));
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('delivery_urgent', expect.objectContaining({ importance: Notifications.AndroidImportance.HIGH, vibrationPattern: expect.any(Array) }));
      });
    
      it('shows an incoming messaging FCM notification in the urgent channel while foregrounded', async () => {
        await presentForegroundPushNotification({
          notification: { title: 'New message', body: 'You have a new conversation message.' },
          data: { type: 'conversation_message', conversationId: 'conversation-1', messageId: 'message-1' },
        });
    
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
          content: expect.objectContaining({
            title: 'New message',
            body: 'You have a new conversation message.',
            data: expect.objectContaining({ type: 'conversation_message', conversationId: 'conversation-1' }),
    ✓ • 87ms

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\mobile-app\services\__tests__\deliveryNotifications.test.ts
    @@ -17,3 +17,3 @@
     import { Linking } from 'react-native';
    -import { formatOverdueBody, routeNotificationResponse, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';
    +import { formatOverdueBody, routeNotificationResponse, routePushData, initializeDeliveryNotificationChannels, presentForegroundPushNotification, updateActiveDeliveryNotification, syncActiveDeliveryNotifications } from '../deliveryNotifications';
     
    @@ -22,2 +22,10 @@
     describe('delivery notifications', () => {
    +  it('routes campaign pushes to the configured screen with a dashboard fallback', () => {
    +    const router = { push: jest.fn(), navigate: jest.fn() };
    +    routePushData({ type: 'campaign', destination: 'overdue' }, router as any);
    +    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/overdue');
    +    routePushData({ type: 'campaign', destination: 'unknown' }, router as any);
    +    expect(router.navigate).toHaveBeenLastCalledWith('/(tabs)');
    +  });
    +
       it('formats overdue minutes and routes legacy request_id payloads', () => {

## Assistant

The scheduler foundation is in place: minute-based processing, dynamic recipient checks, daily send limits, transactional duplicate prevention, retry attempts, inbox persistence, FCM results, worker health, retention cleanup, and basic action reconciliation. I’m now exposing those results in the admin page and finishing the campaign deep-link behavior in the rider app.

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\src\app\pages\Admin\NotificationCampaigns.tsx
    @@ -1,3 +1,3 @@
     import { useCallback, useEffect, useMemo, useState } from 'react';
    -import { BellRing, CalendarClock, Copy, Loader2, Pause, Play, Plus, Send, XCircle } from 'lucide-react';
    +import { BellRing, CalendarClock, Copy, History, Loader2, Pause, Play, Plus, Send, XCircle } from 'lucide-react';
     import { toast } from 'sonner';
    @@ -12,5 +12,7 @@
       send_time: string; weekdays: number[]; repeat_interval_minutes: number | null; max_sends_per_rider: number;
    -  destination: string; recipient_count: number; delivery_count: number; recipients?: Rider[];
    +  destination: string; recipient_count: number; delivery_count: number; sent_count: number; failed_count: number;
    +  skipped_count: number; acted_count: number; next_run_at?: string | null; last_run_at?: string | null; recipients?: Rider[];
     };
     type Rider = { id: string; name: string; email: string };
    +type Delivery = { id: string; rider_name: string; rider_email: string; scheduled_at: string; attempt_number: number; status: string; failure_reason?: string | null; sent_at?: string | null; action_type?: string | null; acted_at?: string | null };
     
    @@ -59,2 +61,5 @@
       const [testRiderId, setTestRiderId] = useState('');
    +  const [workerHealth, setWorkerHealth] = useState<any>(null);
    +  const [historyCampaign, setHistoryCampaign] = useState<Campaign | null>(null);
    +  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
     
    @@ -63,5 +68,6 @@
         try {
    -      const [campaignData, riderData] = await Promise.all([request('/'), request('/riders')]);
    +      const [campaignData, riderData, healthData] = await Promise.all([request('/'), request('/riders'), request('/worker-health')]);
           setCampaigns(campaignData);
           setRiders(riderData);
    +      setWorkerHealth(healthData);
         } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load campaigns'); }
    @@ -127,2 +133,7 @@
     
    +  const openHistory = async (campaign: Campaign) => {
    +    try { setDeliveries(await request(`/${campaign.id}/deliveries`)); setHistoryCampaign(campaign); }
    +    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load delivery history'); }
    +  };
    +
       return <div className="min-h-full bg-slate-50/60 p-4 sm:p-8">
    @@ -131,3 +142,4 @@
             <div><h1 className="flex items-center gap-3 text-2xl font-black text-slate-900"><BellRing className="text-primary" />Notification Campaigns</h1>
    -          <p className="mt-1 text-sm font-medium text-slate-500">Create and prepare rider push campaigns. Automatic scheduling is added in Phase 2.</p></div>
    +          <p className="mt-1 text-sm font-medium text-slate-500">Schedule rider notifications and monitor delivery from one place.</p>
    +          <p className="mt-1 text-xs font-bold text-slate-400">Worker: <span className={workerHealth?.last_status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}>{workerHealth?.last_status || 'checking'}</span>{workerHealth?.last_completed_at ? ` · ${workerHealth.last_completed_at}` : ''}</p></div>
             <Button onClick={openCreate} className="min-h-11"><Plus className="mr-2 h-4 w-4" />New campaign</Button>
    @@ -143,3 +155,3 @@
               <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{campaign.name}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{campaign.status}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{campaign.notification_title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.notification_body}</p></div><CalendarClock className="h-5 w-5 shrink-0 text-slate-400" /></div>
    -          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="font-black text-slate-400">TARGET</span><p className="mt-1 font-bold text-slate-700">{targetOptions.find(([id]) => id === campaign.target_type)?.[1]}</p></div><div><span className="font-black text-slate-400">SCHEDULE</span><p className="mt-1 font-bold text-slate-700">{campaign.start_date.slice(0, 10)} · {campaign.send_time.slice(0, 5)}</p></div><div><span className="font-black text-slate-400">LIMIT</span><p className="mt-1 font-bold text-slate-700">{campaign.max_sends_per_rider} per rider</p></div><div><span className="font-black text-slate-400">DESTINATION</span><p className="mt-1 font-bold capitalize text-slate-700">{campaign.destination}</p></div></div>
    +          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="font-black text-slate-400">TARGET</span><p className="mt-1 font-bold text-slate-700">{targetOptions.find(([id]) => id === campaign.target_type)?.[1]}</p></div><div><span className="font-black text-slate-400">NEXT SEND</span><p className="mt-1 font-bold text-slate-700">{campaign.next_run_at || `${campaign.start_date.slice(0, 10)} · ${campaign.send_time.slice(0, 5)}`}</p></div><div><span className="font-black text-slate-400">DELIVERY</span><p className="mt-1 font-bold text-slate-700">{campaign.sent_count} sent · {campaign.failed_count} failed</p></div><div><span className="font-black text-slate-400">ACTION</span><p className="mt-1 font-bold text-slate-700">{campaign.acted_count} acted · {campaign.destination}</p></div></div>
               <div className="mt-4 flex flex-wrap gap-2">
    @@ -150,2 +162,3 @@
                 <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'duplicate')}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
    +            <Button size="sm" variant="outline" onClick={() => void openHistory(campaign)}><History className="mr-1 h-3.5 w-3.5" />History</Button>
                 {!['cancelled', 'completed'].includes(campaign.status) && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void perform(campaign, 'cancel')}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
    @@ -175,2 +188,5 @@
         <Dialog open={Boolean(testCampaign)} onOpenChange={open => { if (!open) setTestCampaign(null); }}><DialogContent><DialogHeader><DialogTitle>Send test notification</DialogTitle><DialogDescription>Select one rider device. This creates an inbox entry marked as a test.</DialogDescription></DialogHeader><Field label="Rider"><select value={testRiderId} onChange={event => setTestRiderId(event.target.value)}><option value="">Select a rider</option>{riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name} — {rider.email}</option>)}</select></Field><div className="flex justify-end"><Button disabled={!testRiderId || saving} onClick={() => void sendTest()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test</Button></div></DialogContent></Dialog>
    +    <Dialog open={Boolean(historyCampaign)} onOpenChange={open => { if (!open) setHistoryCampaign(null); }}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{historyCampaign?.name} delivery history</DialogTitle><DialogDescription>Latest 500 rider delivery attempts and recorded actions.</DialogDescription></DialogHeader>
    +      {deliveries.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No deliveries recorded yet.</p> : <div className="space-y-2">{deliveries.map(item => <div key={item.id} className="grid gap-2 rounded-xl border border-slate-100 p-3 text-xs sm:grid-cols-5"><div><p className="font-black text-slate-800">{item.rider_name}</p><p className="text-slate-400">{item.rider_email}</p></div><div><p className="font-black uppercase text-slate-400">Scheduled</p><p>{item.scheduled_at}</p></div><div><p className="font-black uppercase text-slate-400">Result</p><p className="font-bold capitalize">{item.status} · attempt {item.attempt_number}</p></div><div><p className="font-black uppercase text-slate-400">Action</p><p>{item.action_type || 'No action recorded'}</p></div><div><p className="font-black uppercase text-slate-400">Details</p><p className="break-words text-rose-600">{item.failure_reason || item.sent_at || '—'}</p></div></div>)}</div>}
    +    </DialogContent></Dialog>
       </div>;

## Activity

    file changes: Completed · 1 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\__tests__\notificationCampaigns.test.ts
    @@ -1,3 +1,3 @@
     import { describe, expect, it, vi } from 'vitest';
    -import { ensureNotificationCampaignTables, newCampaignId } from '../notificationCampaigns';
    +import { ensureNotificationCampaignTables, getInitialCampaignRun, getNextCampaignRun, newCampaignId } from '../notificationCampaigns';
     
    @@ -12,2 +12,19 @@
         expect(ddl).toContain('uq_campaign_delivery_idempotency');
    +    expect(ddl).toContain('notification_campaign_worker_state');
    +  });
    +
    +  it('calculates Philippine recurring runs and repeat limits', () => {
    +    const campaign = {
    +      schedule_type: 'recurring' as const, start_date: '2026-10-26', end_date: '2026-10-30', send_time: '08:00',
    +      weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: 10, max_sends_per_rider: 3,
    +    };
    +    const first = getInitialCampaignRun(campaign, new Date('2026-10-25T23:00:00Z'));
    +    expect(first).toBe('2026-10-26 08:00:00');
    +    expect(getNextCampaignRun(campaign, first!, 1)).toBe('2026-10-26 08:10:00');
    +    expect(getNextCampaignRun(campaign, '2026-10-26 08:20:00', 3)).toBe('2026-10-27 08:00:00');
    +  });
    +
    +  it('rejects expired one-time schedules', () => {
    +    expect(getInitialCampaignRun({ schedule_type: 'one_time', start_date: '2026-10-25', send_time: '08:00', max_sends_per_rider: 1 },
    +      new Date('2026-10-25T01:00:00Z'))).toBeNull();
       });

## Activity

    $ npx tsc -p tsconfig.json --noEmit
    routes/__tests__/conversations.test.ts(68,55): error TS2345: Argument of type 'undefined' is not assignable to parameter of type '{ sent: boolean; providerMessageId?: string | undefined; reason?: string | undefined; }'.
    routes/notifications.ts(197,90): error TS2339: Property 'id' does not exist on type 'ExpoPushTicket'.
      Property 'id' does not exist on type 'ExpoPushErrorReceipt'.
    services/notificationCampaigns.ts(141,8): error TS2304: Cannot find name 'existingDeliveryColumns'.
    services/notificationCampaigns.ts(141,56): error TS1378: Top-level 'await' expressions are only allowed when the 'module' option is set to 'es2022', 'esnext', 'system', 'node16', 'node18', 'node20', 'nodenext', or 'preserve', and the 'target' option is set to 'es2017' or higher.
    services/notificationCampaigns.ts(141,62): error TS2304: Cannot find name 'db'.
    ✗ (1) • 13.01s

## Activity

    $ npx tsc --noEmit
    ✓ • 15.44s

## Activity

    $ npx tsc --noEmit
    src/app/pages/Admin/AnalyticsHub.tsx(14,1): error TS6133: 'OperationalIntegrityView' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(22,3): error TS6133: 'TrendingUp' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(37,3): error TS6133: 'ShieldAlert' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(150,27): error TS6133: 'setDiagnosticsOpen' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(151,28): error TS6133: 'setDiagnosticsRetry' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(152,10): error TS6133: 'diagnosticsLoad' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(153,31): error TS6133: 'setConnectivityFilters' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(174,10): error TS6133: 'integrityData' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(175,10): error TS6133: 'connectivityData' is declared but its value is never read.
    src/app/pages/Admin/AnalyticsHub.tsx(1117,10): error TS6133: 'RiderConnectivityView' is declared but its value is never read.
    ✗ (1) • 24.94s

## Activity

    $ $lines=Get-Content server/services/notificationCampaigns.ts; for($i=55;$i -le 150;$i++){"$i`:$($lines[$i-1])"}; $lines=Get-Content server/routes/__tests__/conversations.test.ts; for($i=55;$i -le 75;$i++){"$i`:$($lines[$i-1])"}
    55:    action_type VARCHAR(32) NULL,
    56:    acted_at DATETIME NULL,
    57:    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    58:    UNIQUE KEY uq_campaign_delivery_idempotency (idempotency_key),
    59:    INDEX idx_campaign_delivery_campaign (campaign_id, created_at),
    60:    CONSTRAINT fk_campaign_delivery_campaign FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(id) ON DELETE CASCADE
    61:  )`);
    62:  await db.query(`CREATE TABLE IF NOT EXISTS notification_campaign_worker_state (
    63:    worker_key VARCHAR(64) PRIMARY KEY,
    64:    last_started_at DATETIME NULL,
    65:    last_completed_at DATETIME NULL,
    66:    last_status VARCHAR(16) NOT NULL DEFAULT 'idle',
    67:    last_error VARCHAR(500) NULL,
    68:    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    69:  )`);
    70:  const [campaignColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    71:    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaigns'
    72:      AND COLUMN_NAME IN ('next_run_at','last_run_at','completed_at')`);
    73:  const existingCampaignColumns = new Set((campaignColumns as any[]).map(row => row.COLUMN_NAME));
    74:  if (!existingCampaignColumns.has('next_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN next_run_at DATETIME NULL');
    75:  if (!existingCampaignColumns.has('last_run_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN last_run_at DATETIME NULL');
    76:  if (!existingCampaignColumns.has('completed_at')) await db.query('ALTER TABLE notification_campaigns ADD COLUMN completed_at DATETIME NULL');
    77:  const [deliveryColumns] = await db.query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
    78:    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notification_campaign_deliveries'
    79:      AND COLUMN_NAME IN ('notification_id','action_type','acted_at')`);
    80:  const existingDeliveryColumns = new Set((deliveryColumns as any[]).map(row => row.COLUMN_NAME));
    81:  if (!existingDeliveryColumns.has('action_type')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN action_type VARCHAR(32) NULL');
    82:  if (!existingDeliveryColumns.has('acted_at')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN acted_at DATETIME NULL');
    83:}
    84:
    85:export function newCampaignId(): string {
    86:  return `campaign_${crypto.randomUUID()}`;
    87:}
    88:
    89:export type CampaignSchedule = {
    90:  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date?: string | null;
    91:  send_time: string; weekdays?: number[] | string | null; repeat_interval_minutes?: number | null; max_sends_per_rider: number;
    92:};
    93:
    94:const mysqlNow = (now: Date) => {
    95:  const ph = getPhilippineDateTime(now);
    96:  return `${ph.date} ${ph.time}:00`;
    97:};
    98:const weekday = (date: string) => {
    99:  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    100:  return day === 0 ? 7 : day;
    101:};
    102:const parseWeekdays = (value: CampaignSchedule['weekdays']): number[] => {
    103:  if (Array.isArray(value)) return value;
    104:  if (typeof value !== 'string') return [];
    105:  try { return JSON.parse(value); } catch { return []; }
    106:};
    107:
    108:export function getInitialCampaignRun(campaign: CampaignSchedule, now: Date = new Date()): string | null {
    109:  if (campaign.schedule_type === 'immediate') return mysqlNow(now);
    110:  const current = getPhilippineDateTime(now);
    111:  if (campaign.schedule_type === 'one_time') {
    112:    const run = `${campaign.start_date} ${campaign.send_time.slice(0, 5)}:00`;
    113:    return run >= mysqlNow(now) ? run : null;
    114:  }
    115:  const days = new Set(parseWeekdays(campaign.weekdays));
    116:  let date = campaign.start_date > current.date ? campaign.start_date : current.date;
    117:  for (let offset = 0; offset < 370; offset++, date = addPhilippineDays(date, 1)) {
    118:    if (campaign.end_date && date > campaign.end_date) return null;
    119:    const run = `${date} ${campaign.send_time.slice(0, 5)}:00`;
    120:    if (days.has(weekday(date)) && run >= mysqlNow(now)) return run;
    121:  }
    122:  return null;
    123:}
    124:
    125:export function getNextCampaignRun(campaign: CampaignSchedule, previousRun: string, runsOnDate: number): string | null {
    126:  const date = previousRun.slice(0, 10);
    127:  if (campaign.repeat_interval_minutes && runsOnDate < campaign.max_sends_per_rider) {
    128:    const utc = Date.parse(`${previousRun.replace(' ', 'T')}+08:00`) + campaign.repeat_interval_minutes * 60_000;
    129:    const next = getPhilippineDateTime(new Date(utc));
    130:    return `${next.date} ${next.time}:00`;
    131:  }
    132:  if (campaign.schedule_type !== 'recurring') return null;
    133:  const days = new Set(parseWeekdays(campaign.weekdays));
    134:  let nextDate = addPhilippineDays(date, 1);
    135:  for (let offset = 0; offset < 370; offset++, nextDate = addPhilippineDays(nextDate, 1)) {
    136:    if (campaign.end_date && nextDate > campaign.end_date) return null;
    137:    if (days.has(weekday(nextDate))) return `${nextDate} ${campaign.send_time.slice(0, 5)}:00`;
    138:  }
    139:  return null;
    140:}
    141:  if (!existingDeliveryColumns.has('notification_id')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN notification_id VARCHAR(64) NULL');
    142:
    143:
    144:
    145:
    146:
    147:
    148:
    149:
    150:
    55:
    56:describe('conversation REST routes', () => {
    57:  beforeEach(() => {
    58:    vi.resetAllMocks();
    59:    emitted.length = 0;
    60:    emit.mockImplementation((rooms, event, payload) => { emitted.push({ rooms, event, payload }); });
    61:    io.to.mockImplementation((rooms) => ({
    62:      emit: (event, payload) => emit(Array.isArray(rooms) ? rooms : [rooms], event, payload),
    63:    }));
    64:    messaging.listConversationDeliveryTargets.mockResolvedValue([
    65:      { userId: 'admin-1', requestId: 'req-1' },
    66:      { userId: 'rider-1', requestId: 'req-1' },
    67:    ]);
    68:    vi.mocked(sendPushNotification).mockResolvedValue(undefined);
    69:  });
    70:
    71:  afterEach(() => { vi.restoreAllMocks(); });
    72:
    73:  it.each(['admin-1:admin', 'rider-1:rider'])('fans out %s through one authorized user-room union and pushes only peers', async (actor) => {
    74:    messaging.createMessage.mockResolvedValue(savedMessage);
    75:    const response = await request(app).post('/api/conversations/conv-1/messages').set('x-test-user', actor).send(sendBody);
    ✓ • 122ms

## Activity

    file changes: Completed · 3 changes
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\__tests__\conversations.test.ts
    @@ -67,3 +67,3 @@
         ]);
    -    vi.mocked(sendPushNotification).mockResolvedValue(undefined);
    +    vi.mocked(sendPushNotification).mockResolvedValue({ sent: true });
       });
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\routes\notifications.ts
    @@ -196,3 +196,4 @@
           const tickets = await expo.sendPushNotificationsAsync(chunk);
    -      providerMessageId ||= tickets.find(ticket => ticket.status === 'ok' && ticket.id)?.id;
    +      const accepted = tickets.find(ticket => ticket.status === 'ok');
    +      providerMessageId ||= accepted && 'id' in accepted ? accepted.id : undefined;
         }
    Update { move_path: None }: C:\Users\63938\Desktop\Angel\production\rider-scheduling-system\server\services\notificationCampaigns.ts
    @@ -80,2 +80,3 @@
       const existingDeliveryColumns = new Set((deliveryColumns as any[]).map(row => row.COLUMN_NAME));
    +  if (!existingDeliveryColumns.has('notification_id')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN notification_id VARCHAR(64) NULL');
       if (!existingDeliveryColumns.has('action_type')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN action_type VARCHAR(32) NULL');
    @@ -140,2 +141 @@
     }
    -  if (!existingDeliveryColumns.has('notification_id')) await db.query('ALTER TABLE notification_campaign_deliveries ADD COLUMN notification_id VARCHAR(64) NULL');

## Activity

    $ rg -n "sendPushNotification\).*mockResolvedValue\(undefined|sendPushNotification:.*mock" server -g '*.test.ts'; npx tsc -p tsconfig.json --noEmit
    rg: server: IO error for operation on server: The system cannot find the file specified. (os error 2)
    ✓ • 7.85s
