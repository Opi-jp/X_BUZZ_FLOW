const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function clearWatchlist() {
  try {
    // WatchlistTweetを先に削除
    const deletedTweets = await prisma.watchlistTweet.deleteMany({});
    console.log(`Deleted ${deletedTweets.count} watchlist tweets`);
    
    // WatchlistUserを削除
    const deletedUsers = await prisma.watchlistUser.deleteMany({});
    console.log(`Deleted ${deletedUsers.count} watchlist users`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearWatchlist();