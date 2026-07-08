// Shared event catalog + envelope types (TELEMETRY.md §4-5). Mirror of the
// Flutter app's analytics_event.dart — keep the two in lockstep.

export const AnalyticsEvents = {
  // A. Lifecycle / session
  appInstalled: 'app_installed',
  sessionStart: 'session_start',
  sessionEnd: 'session_end',
  appForeground: 'app_foreground',
  appBackground: 'app_background',
  // B. Auth / account
  loginAttempt: 'login_attempt',
  loginSuccess: 'login_success',
  loginFailure: 'login_failure',
  logout: 'logout',
  sessionExpired: 'session_expired',
  tokenRefresh: 'token_refresh',
  accessBlocked: 'access_blocked',
  // C. Navigation / screen views
  screenView: 'screen_view',
  screenLeave: 'screen_leave',
  tabSwitch: 'tab_switch',
  drawerOpened: 'drawer_opened',
  // D. Report data / interactions
  reportLoaded: 'report_loaded',
  reportEmpty: 'report_empty',
  filterApplied: 'filter_applied',
  dateRangeChanged: 'date_range_changed',
  sucursalSelected: 'sucursal_selected',
  sortChanged: 'sort_changed',
  detailOpened: 'detail_opened',
  paginationLoadMore: 'pagination_load_more',
  pullToRefresh: 'pull_to_refresh',
  retryClicked: 'retry_clicked',
  exportGenerated: 'export_generated',
  searchUsed: 'search_used',
  // E. Performance / reliability
  apiRequest: 'api_request',
  apiError: 'api_error',
  connectionError: 'connection_error',
  appError: 'app_error',
  // F. App health / version
  versionCheck: 'version_check',
  forceUpdateShown: 'force_update_shown',
  storeRedirectClicked: 'store_redirect_clicked'
} as const;

export const ScreenNames = {
  login: 'login',
  principal: 'principal',
  ventas: 'ventas',
  devoluciones: 'devoluciones',
  productos: 'productos',
  ventasSucursalDetail: 'ventas_sucursal_detail',
  devolucionesSucursalDetail: 'devoluciones_sucursal_detail',
  cuadreCaja: 'cuadre_caja',
  cuentasPorCobrar: 'cuentas_por_cobrar',
  ventasProductoMarca: 'ventas_producto_marca',
  ventasFacturador: 'ventas_facturador',
  inventario: 'inventario',
  vencimientos: 'vencimientos',
  transferencias: 'transferencias'
} as const;

export type EventProperties = Record<string, unknown>;

export interface AnalyticsContext {
  user_id: number | null;
  username: string | null;
  empresa: string | null;
  role: string | null;
  app: 'web';
  app_version: string;
  platform: 'web';
  os_version: string | null;
  device_model: string | null;
  locale: string;
  screen_w: number | null;
  screen_h: number | null;
  network: string;
  is_first_session: boolean;
}

export interface AnalyticsEvent {
  event_id: string;
  event_name: string;
  event_version: number;
  occurred_at: string;
  sequence: number;
  session_id: string;
  device_id: string;
  context: AnalyticsContext;
  properties: EventProperties;
}
