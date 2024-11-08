// Custom type for metadata values
type MetadataValue = string | number | boolean | null | undefined
type MetadataRecord = Record<string, MetadataValue | MetadataValue[]>

// Custom type for user preferences
type UserPreference = string | number | boolean | null
type UserPreferences = Record<string, UserPreference>

// Event Categories
export enum AnalyticsCategory {
  Auth = 'auth',
  Challenge = 'challenge',
  Game = 'game',
  Profile = 'profile',
  Community = 'community',
  Navigation = 'navigation',
  Error = 'error'
}

// Event Actions
export enum AnalyticsAction {
  // Auth Events
  SignUp = 'sign_up',
  SignIn = 'sign_in',
  SignOut = 'sign_out',
  VerifyEmail = 'verify_email',
  ResetPassword = 'reset_password',
  UpdateProfile = 'update_profile',

  // Challenge Events
  StartChallenge = 'start_challenge',
  CompleteChallenge = 'complete_challenge',
  SubmitSolution = 'submit_solution',
  CreateChallenge = 'create_challenge',
  RateChallenge = 'rate_challenge',

  // Game Events
  StartGame = 'start_game',
  EndGame = 'end_game',
  AchieveHighScore = 'achieve_high_score',
  UnlockAchievement = 'unlock_achievement',
  CreateBoard = 'create_board',
  JoinGame = 'join_game',

  // Profile Events
  UpdateSettings = 'update_settings',
  ChangeAvatar = 'change_avatar',
  UpdatePreferences = 'update_preferences',
  ConnectSocial = 'connect_social',

  // Community Events
  CreatePost = 'create_post',
  CommentPost = 'comment_post',
  JoinEvent = 'join_event',
  ShareContent = 'share_content',
  FollowUser = 'follow_user',

  // Navigation Events
  PageView = 'page_view',
  ButtonClick = 'button_click',
  MenuOpen = 'menu_open',
  Search = 'search',

  // Error Events
  ApiError = 'api_error',
  ValidationError = 'validation_error',
  AuthError = 'auth_error',
  NetworkError = 'network_error'
}

// Event Properties Interface
export interface AnalyticsEventProperties {
  userId?: string
  sessionId?: string
  timestamp?: number
  location?: string
  deviceType?: string
  browser?: string
  os?: string
  value?: number
  label?: string
  metadata?: MetadataRecord
}

// Event Interface
export interface AnalyticsEvent {
  category: AnalyticsCategory
  action: AnalyticsAction
  properties?: AnalyticsEventProperties
}

// User Properties Interface
export interface AnalyticsUserProperties {
  userId: string
  email?: string
  username?: string
  accountType?: string
  createdAt?: string
  lastActive?: string
  preferences?: UserPreferences
  segments?: string[]
}

// Session Interface
export interface AnalyticsSession {
  sessionId: string
  userId?: string
  startTime: number
  endTime?: number
  duration?: number
  events: AnalyticsEvent[]
  metadata?: MetadataRecord
}

// Performance Metrics Interface
export interface AnalyticsPerformanceMetrics {
  pageLoadTime?: number
  timeToInteractive?: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
}

// Error Context Type
type ErrorContext = {
  code?: string
  details?: string
  timestamp?: number
  metadata?: MetadataRecord
}

// Error Event Interface
export interface AnalyticsErrorEvent extends AnalyticsEvent {
  error: {
    name: string
    message: string
    stack?: string
    code?: string
    context?: ErrorContext
  }
}

// Custom Dimensions Type
type CustomDimensionValue = string | number | boolean
type CustomDimensions = Record<string, CustomDimensionValue>

// Analytics Configuration Interface
export interface AnalyticsConfig {
  enabled: boolean
  debugMode?: boolean
  sampleRate?: number
  excludedRoutes?: string[]
  anonymizeIp?: boolean
  cookieExpiration?: number
  customDimensions?: CustomDimensions
}

// Analytics Provider Interface
export interface AnalyticsProvider {
  trackEvent(event: AnalyticsEvent): Promise<void>
  trackError(error: AnalyticsErrorEvent): Promise<void>
  setUserProperties(properties: AnalyticsUserProperties): Promise<void>
  startSession(userId?: string): Promise<string>
  endSession(sessionId: string): Promise<void>
  getPerformanceMetrics(): Promise<AnalyticsPerformanceMetrics>
}