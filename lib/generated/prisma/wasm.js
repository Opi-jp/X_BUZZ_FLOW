
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.BuzzPostScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  content: 'content',
  authorUsername: 'authorUsername',
  authorId: 'authorId',
  likesCount: 'likesCount',
  retweetsCount: 'retweetsCount',
  repliesCount: 'repliesCount',
  impressionsCount: 'impressionsCount',
  postedAt: 'postedAt',
  collectedAt: 'collectedAt',
  url: 'url',
  theme: 'theme',
  language: 'language',
  mediaUrls: 'mediaUrls',
  hashtags: 'hashtags',
  chromaId: 'chromaId',
  authorFollowers: 'authorFollowers',
  authorFollowing: 'authorFollowing',
  authorVerified: 'authorVerified'
};

exports.Prisma.ScheduledPostScalarFieldEnum = {
  id: 'id',
  content: 'content',
  scheduledTime: 'scheduledTime',
  status: 'status',
  postType: 'postType',
  refPostId: 'refPostId',
  templateType: 'templateType',
  aiGenerated: 'aiGenerated',
  aiPrompt: 'aiPrompt',
  editedContent: 'editedContent',
  postedAt: 'postedAt',
  postResult: 'postResult',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PostAnalyticsScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  impressions: 'impressions',
  engagements: 'engagements',
  likes: 'likes',
  retweets: 'retweets',
  replies: 'replies',
  profileClicks: 'profileClicks',
  urlClicks: 'urlClicks',
  detailExpands: 'detailExpands',
  engagementRate: 'engagementRate',
  collectedAt: 'collectedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  twitterId: 'twitterId',
  username: 'username',
  name: 'name',
  email: 'email',
  image: 'image',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  tokenSecret: 'tokenSecret',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.NewsSourceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  rssUrl: 'rssUrl',
  category: 'category',
  language: 'language',
  isActive: 'isActive',
  lastFetched: 'lastFetched',
  createdAt: 'createdAt'
};

exports.Prisma.NewsArticleScalarFieldEnum = {
  id: 'id',
  sourceId: 'sourceId',
  title: 'title',
  description: 'description',
  url: 'url',
  publishedAt: 'publishedAt',
  category: 'category',
  tags: 'tags',
  importance: 'importance',
  processed: 'processed',
  createdAt: 'createdAt',
  metadata: 'metadata'
};

exports.Prisma.NewsThreadScalarFieldEnum = {
  id: 'id',
  status: 'status',
  createdAt: 'createdAt',
  metadata: 'metadata',
  scheduledAt: 'scheduledAt',
  title: 'title',
  postedAt: 'postedAt'
};

exports.Prisma.NewsThreadItemScalarFieldEnum = {
  id: 'id',
  threadId: 'threadId',
  articleId: 'articleId',
  order: 'order',
  content: 'content',
  createdAt: 'createdAt'
};

exports.Prisma.NewsAnalysisScalarFieldEnum = {
  id: 'id',
  articleId: 'articleId',
  summary: 'summary',
  sentiment: 'sentiment',
  keywords: 'keywords',
  topics: 'topics',
  createdAt: 'createdAt'
};

exports.Prisma.JobQueueScalarFieldEnum = {
  id: 'id',
  type: 'type',
  payload: 'payload',
  status: 'status',
  priority: 'priority',
  attempts: 'attempts',
  maxAttempts: 'maxAttempts',
  runAt: 'runAt',
  completedAt: 'completedAt',
  error: 'error',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CollectionPresetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  settings: 'settings',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WatchlistUserScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  twitterId: 'twitterId',
  username: 'username',
  displayName: 'displayName',
  followers: 'followers',
  following: 'following',
  isActive: 'isActive',
  lastChecked: 'lastChecked',
  createdAt: 'createdAt'
};

exports.Prisma.WatchlistTweetScalarFieldEnum = {
  id: 'id',
  watchlistUserId: 'watchlistUserId',
  tweetId: 'tweetId',
  content: 'content',
  createdAt: 'createdAt',
  retweetCount: 'retweetCount',
  likeCount: 'likeCount',
  replyCount: 'replyCount',
  collectedAt: 'collectedAt'
};

exports.Prisma.InteractionHistoryScalarFieldEnum = {
  id: 'id',
  watchlistUserId: 'watchlistUserId',
  interactionType: 'interactionType',
  tweetId: 'tweetId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.PerplexityReportScalarFieldEnum = {
  id: 'id',
  query: 'query',
  focus: 'focus',
  rawAnalysis: 'rawAnalysis',
  trends: 'trends',
  insights: 'insights',
  contentAngles: 'contentAngles',
  marketContext: 'marketContext',
  competitorActivity: 'competitorActivity',
  riskFactors: 'riskFactors',
  createdAt: 'createdAt'
};

exports.Prisma.CotSessionScalarFieldEnum = {
  id: 'id',
  theme: 'theme',
  style: 'style',
  platform: 'platform',
  status: 'status',
  currentPhase: 'currentPhase',
  currentStep: 'currentStep',
  lastError: 'lastError',
  retryCount: 'retryCount',
  nextRetryAt: 'nextRetryAt',
  totalTokens: 'totalTokens',
  totalDuration: 'totalDuration',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  completedAt: 'completedAt'
};

exports.Prisma.CotPhaseScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  phaseNumber: 'phaseNumber',
  thinkPrompt: 'thinkPrompt',
  thinkResult: 'thinkResult',
  thinkTokens: 'thinkTokens',
  thinkAt: 'thinkAt',
  executeResult: 'executeResult',
  executeDuration: 'executeDuration',
  executeAt: 'executeAt',
  integratePrompt: 'integratePrompt',
  integrateResult: 'integrateResult',
  integrateTokens: 'integrateTokens',
  integrateAt: 'integrateAt',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CotDraftScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  conceptNumber: 'conceptNumber',
  title: 'title',
  hook: 'hook',
  angle: 'angle',
  format: 'format',
  content: 'content',
  visualGuide: 'visualGuide',
  timing: 'timing',
  hashtags: 'hashtags',
  newsSource: 'newsSource',
  sourceUrl: 'sourceUrl',
  kpis: 'kpis',
  riskAssessment: 'riskAssessment',
  optimizationTips: 'optimizationTips',
  status: 'status',
  editedContent: 'editedContent',
  scheduledAt: 'scheduledAt',
  postedAt: 'postedAt',
  postId: 'postId',
  viralScore: 'viralScore',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CotDraftPerformanceScalarFieldEnum = {
  id: 'id',
  draftId: 'draftId',
  likes30m: 'likes30m',
  retweets30m: 'retweets30m',
  replies30m: 'replies30m',
  impressions30m: 'impressions30m',
  likes1h: 'likes1h',
  retweets1h: 'retweets1h',
  replies1h: 'replies1h',
  impressions1h: 'impressions1h',
  likes24h: 'likes24h',
  retweets24h: 'retweets24h',
  replies24h: 'replies24h',
  impressions24h: 'impressions24h',
  engagementRate: 'engagementRate',
  viralCoefficient: 'viralCoefficient',
  collectedAt: 'collectedAt',
  lastUpdateAt: 'lastUpdateAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.PostStatus = exports.$Enums.PostStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  POSTED: 'POSTED',
  FAILED: 'FAILED'
};

exports.PostType = exports.$Enums.PostType = {
  NEW: 'NEW',
  RETWEET: 'RETWEET',
  QUOTE: 'QUOTE'
};

exports.CotSessionStatus = exports.$Enums.CotSessionStatus = {
  PENDING: 'PENDING',
  THINKING: 'THINKING',
  EXECUTING: 'EXECUTING',
  INTEGRATING: 'INTEGRATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PAUSED: 'PAUSED'
};

exports.CotPhaseStep = exports.$Enums.CotPhaseStep = {
  THINK: 'THINK',
  EXECUTE: 'EXECUTE',
  INTEGRATE: 'INTEGRATE'
};

exports.CotPhaseStatus = exports.$Enums.CotPhaseStatus = {
  PENDING: 'PENDING',
  THINKING: 'THINKING',
  EXECUTING: 'EXECUTING',
  INTEGRATING: 'INTEGRATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.CotDraftStatus = exports.$Enums.CotDraftStatus = {
  DRAFT: 'DRAFT',
  EDITED: 'EDITED',
  SCHEDULED: 'SCHEDULED',
  POSTED: 'POSTED',
  ARCHIVED: 'ARCHIVED'
};

exports.Prisma.ModelName = {
  BuzzPost: 'BuzzPost',
  ScheduledPost: 'ScheduledPost',
  PostAnalytics: 'PostAnalytics',
  User: 'User',
  Session: 'Session',
  NewsSource: 'NewsSource',
  NewsArticle: 'NewsArticle',
  NewsThread: 'NewsThread',
  NewsThreadItem: 'NewsThreadItem',
  NewsAnalysis: 'NewsAnalysis',
  JobQueue: 'JobQueue',
  CollectionPreset: 'CollectionPreset',
  WatchlistUser: 'WatchlistUser',
  WatchlistTweet: 'WatchlistTweet',
  InteractionHistory: 'InteractionHistory',
  PerplexityReport: 'PerplexityReport',
  CotSession: 'CotSession',
  CotPhase: 'CotPhase',
  CotDraft: 'CotDraft',
  CotDraftPerformance: 'CotDraftPerformance'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
