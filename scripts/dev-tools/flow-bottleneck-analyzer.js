#!/usr/bin/env node

const { PrismaClient } = require('../lib/generated/prisma');
const prisma = new PrismaClient();
const chalk = require('chalk');

async function analyzeFlowBottlenecks() {
  try {
    console.log(chalk.yellow.bold('🔍 X_BUZZ_FLOW Create→Post Flow Analysis'));
    console.log(chalk.gray('='.repeat(50)));

    // Get all sessions from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sessions = await prisma.viralSession.findMany({
      where: {
        createdAt: { gte: oneDayAgo }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        drafts: true
      }
    });

    console.log(`\n📊 Sessions in last 24 hours: ${sessions.length}`);

    // Analyze flow stages
    const flowStages = {
      'Create': { status: 'CREATED', count: 0, stuck: [] },
      'Perplexity': { status: ['COLLECTING', 'TOPICS_COLLECTED'], count: 0, stuck: [] },
      'GPT': { status: ['GENERATING', 'CONCEPTS_GENERATED'], count: 0, stuck: [] },
      'Claude': { status: ['CONTENTS_GENERATING', 'CONTENTS_GENERATED'], count: 0, stuck: [] },
      'Completed': { status: 'COMPLETED', count: 0, stuck: [] },
      'Error': { status: 'ERROR', count: 0, stuck: [] }
    };

    // Categorize sessions
    sessions.forEach(session => {
      const ageInMinutes = (Date.now() - session.createdAt.getTime()) / 1000 / 60;
      
      if (session.status === 'CREATED') {
        flowStages.Create.count++;
        if (ageInMinutes > 10) flowStages.Create.stuck.push(session);
      } else if (['COLLECTING', 'TOPICS_COLLECTED'].includes(session.status)) {
        flowStages.Perplexity.count++;
        if (session.status === 'COLLECTING' && ageInMinutes > 5) {
          flowStages.Perplexity.stuck.push(session);
        } else if (session.status === 'TOPICS_COLLECTED' && ageInMinutes > 10 && !session.concepts) {
          flowStages.Perplexity.stuck.push(session);
        }
      } else if (['GENERATING', 'CONCEPTS_GENERATED'].includes(session.status)) {
        flowStages.GPT.count++;
        if (session.status === 'GENERATING' && ageInMinutes > 5) {
          flowStages.GPT.stuck.push(session);
        } else if (session.status === 'CONCEPTS_GENERATED' && ageInMinutes > 10 && !session.contents) {
          flowStages.GPT.stuck.push(session);
        }
      } else if (['CONTENTS_GENERATING', 'CONTENTS_GENERATED'].includes(session.status)) {
        flowStages.Claude.count++;
        if (session.status === 'CONTENTS_GENERATING' && ageInMinutes > 5) {
          flowStages.Claude.stuck.push(session);
        }
      } else if (session.status === 'COMPLETED') {
        flowStages.Completed.count++;
      } else if (session.status === 'ERROR') {
        flowStages.Error.count++;
      }
    });

    // Display flow funnel
    console.log(chalk.cyan('\n🏗️  Flow Funnel:'));
    Object.entries(flowStages).forEach(([stage, data]) => {
      const percentage = sessions.length > 0 ? Math.round((data.count / sessions.length) * 100) : 0;
      const bar = '█'.repeat(Math.floor(percentage / 2));
      console.log(`  ${stage.padEnd(12)} ${data.count.toString().padStart(3)} (${percentage}%) ${chalk.green(bar)}`);
    });

    // Display bottlenecks
    console.log(chalk.red('\n🚨 Bottlenecks Identified:'));
    let bottleneckCount = 0;
    
    Object.entries(flowStages).forEach(([stage, data]) => {
      if (data.stuck.length > 0) {
        console.log(chalk.yellow(`\n  ${stage} Stage - ${data.stuck.length} stuck sessions:`));
        data.stuck.slice(0, 3).forEach(session => {
          const ageInMinutes = Math.floor((Date.now() - session.createdAt.getTime()) / 1000 / 60);
          console.log(`    • ${session.id.slice(0, 8)}... "${session.theme}" - ${ageInMinutes}min old`);
        });
        bottleneckCount += data.stuck.length;
      }
    });

    if (bottleneckCount === 0) {
      console.log(chalk.green('  ✅ No bottlenecks detected!'));
    }

    // Analyze success rate
    console.log(chalk.blue('\n📈 Success Metrics:'));
    const successRate = sessions.length > 0 
      ? Math.round((flowStages.Completed.count / sessions.length) * 100)
      : 0;
    
    console.log(`  • Overall Success Rate: ${successRate}%`);
    console.log(`  • Sessions with Drafts: ${sessions.filter(s => s.drafts.length > 0).length}`);
    console.log(`  • Average Drafts per Session: ${
      sessions.length > 0 
        ? (sessions.reduce((sum, s) => sum + s.drafts.length, 0) / sessions.length).toFixed(1)
        : 0
    }`);

    // Check API errors
    console.log(chalk.magenta('\n🔧 Error Analysis:'));
    const errorSessions = sessions.filter(s => s.status === 'ERROR');
    if (errorSessions.length > 0) {
      console.log(`  • Total Errors: ${errorSessions.length}`);
      errorSessions.slice(0, 3).forEach(session => {
        console.log(`    - ${session.id.slice(0, 8)}... "${session.theme}"`);
      });
    } else {
      console.log('  ✅ No errors in the last 24 hours');
    }

    // Recommendations
    console.log(chalk.yellow('\n💡 Recommendations:'));
    
    if (flowStages.Perplexity.stuck.length > 0) {
      console.log('  • Multiple sessions stuck at Perplexity stage - check API limits or connectivity');
    }
    
    if (flowStages.Create.stuck.length > 5) {
      console.log('  • Many sessions not started - consider implementing auto-progression');
    }
    
    const topicsCollectedNotProgressing = sessions.filter(s => 
      s.status === 'TOPICS_COLLECTED' && 
      !s.concepts &&
      (Date.now() - s.createdAt.getTime()) / 1000 / 60 > 10
    );
    
    if (topicsCollectedNotProgressing.length > 0) {
      console.log('  • Sessions have topics but no concepts - GPT generation may need attention');
      console.log(`    Affected sessions: ${topicsCollectedNotProgressing.map(s => s.id.slice(0, 8)).join(', ')}`);
    }

    // Check draft posting rate
    const drafts = await prisma.viralDraft.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      orderBy: { createdAt: 'desc' }
    });
    
    const postedDrafts = drafts.filter(d => d.postedAt !== null);
    const postingRate = drafts.length > 0 
      ? Math.round((postedDrafts.length / drafts.length) * 100)
      : 0;
    
    console.log(chalk.cyan('\n📮 Draft→Post Conversion:'));
    console.log(`  • Total Drafts: ${drafts.length}`);
    console.log(`  • Posted: ${postedDrafts.length}`);
    console.log(`  • Posting Rate: ${postingRate}%`);
    
    if (postingRate < 50 && drafts.length > 5) {
      console.log(chalk.yellow('  ⚠️  Low posting rate - consider reviewing draft quality or posting automation'));
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeFlowBottlenecks();