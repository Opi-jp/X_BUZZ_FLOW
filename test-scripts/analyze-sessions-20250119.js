#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();

async function analyzeSessions() {
  try {
    // Get session status distribution
    const sessions = await prisma.viralSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        drafts: true
      }
    });

    console.log('📊 Recent 30 Sessions Analysis:');
    console.log('=====================================');
    
    const statusCount = {};
    sessions.forEach(s => {
      statusCount[s.status] = (statusCount[s.status] || 0) + 1;
    });
    
    console.log('\n📈 Status Distribution:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n🔍 Session Flow Analysis:');
    
    // Group by flow stage
    const flowStages = {
      'Not Started': sessions.filter(s => s.status === 'CREATED'),
      'Perplexity Stage': sessions.filter(s => s.status === 'COLLECTING' || s.status === 'TOPICS_COLLECTED'),
      'GPT Stage': sessions.filter(s => s.status === 'GENERATING' || s.status === 'CONCEPTS_GENERATED'),
      'Claude Stage': sessions.filter(s => s.status === 'CONTENTS_GENERATING' || s.status === 'CONTENTS_GENERATED'),
      'Completed': sessions.filter(s => s.status === 'COMPLETED')
    };

    Object.entries(flowStages).forEach(([stage, stageSessions]) => {
      if (stageSessions.length > 0) {
        console.log(`\n  ${stage} (${stageSessions.length}):`);
        stageSessions.slice(0, 5).forEach(s => {
          const hasTopics = s.topics && s.topics.length > 0;
          const hasConcepts = s.concepts && s.concepts.length > 0;
          const hasContents = s.contents && s.contents.length > 0;
          const hasDrafts = s.drafts.length > 0;
          
          console.log(`    - ${s.id.slice(0, 8)}... "${s.theme}"`);
          console.log(`      Status: ${s.status}`);
          console.log(`      Data: Topics:${hasTopics ? '✓' : '✗'} Concepts:${hasConcepts ? '✓' : '✗'} Contents:${hasContents ? '✓' : '✗'} Drafts:${hasDrafts ? '✓('+s.drafts.length+')' : '✗'}`);
          console.log(`      Created: ${s.createdAt.toISOString()}`);
        });
      }
    });

    // Check for stuck sessions
    const stuckSessions = sessions.filter(s => {
      const ageInMinutes = (Date.now() - s.createdAt.getTime()) / 1000 / 60;
      return (
        (s.status === 'COLLECTING' && ageInMinutes > 5) ||
        (s.status === 'GENERATING' && ageInMinutes > 5) ||
        (s.status === 'CONTENTS_GENERATING' && ageInMinutes > 5)
      );
    });

    if (stuckSessions.length > 0) {
      console.log('\n⚠️  Potentially Stuck Sessions (older than 5 minutes):');
      stuckSessions.forEach(s => {
        const ageInMinutes = Math.floor((Date.now() - s.createdAt.getTime()) / 1000 / 60);
        console.log(`  - ${s.id.slice(0, 8)}... (${s.status}) - "${s.theme}" - ${ageInMinutes} minutes old`);
      });
    }

    // Check draft status
    const drafts = await prisma.viralDraftV2.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    console.log('\n📝 Draft Status Distribution:');
    const draftStatusCount = {};
    drafts.forEach(d => {
      draftStatusCount[d.status] = (draftStatusCount[d.status] || 0) + 1;
    });
    
    Object.entries(draftStatusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check recent posts
    const recentPosts = drafts.filter(d => d.postedAt !== null);
    if (recentPosts.length > 0) {
      console.log('\n✅ Recently Posted:');
      recentPosts.slice(0, 5).forEach(d => {
        console.log(`  - ${d.id.slice(0, 8)}... posted at ${d.postedAt.toISOString()}`);
      });
    }

    // Summary
    console.log('\n📋 Summary:');
    console.log(`  Total Sessions: ${sessions.length}`);
    console.log(`  Sessions with Drafts: ${sessions.filter(s => s.drafts.length > 0).length}`);
    console.log(`  Total Drafts: ${drafts.length}`);
    console.log(`  Posted Drafts: ${recentPosts.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSessions();