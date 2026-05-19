import { supabase } from './supabase.js';

const POINT_VALUES = {
  fragrance_rating: 5,
  season_performance_rating: 8,
  wearability_rating: 8,
  dupe_confidence_rating: 6,
  thread_created: 10,
  reply_created: 6,
  thread_upvote_received: 2,
  reply_upvote_received: 1,
  fragrance_submission_approved: 50
};

async function getCurrentPointsBalance(actionType, referenceType, referenceId, userId) {
  const { data, error } = await supabase
    .from('points_events')
    .select('points_delta')
    .eq('action_type', actionType)
    .eq('reference_type', referenceType)
    .eq('reference_id', referenceId)
    .eq('user_id', userId);

  if (error) {
    console.error('points-helper: Error checking current balance:', error);
    return null;
  }

  return (data || []).reduce((sum, row) => sum + (Number(row.points_delta) || 0), 0);
}

export async function awardPoints(actionType, referenceType, referenceId, userId, points = null) {
  if (!userId) {
    console.error('points-helper: Cannot award points without userId');
    return { success: false, error: 'Missing userId' };
  }

  const pointsToAward = points !== null ? points : POINT_VALUES[actionType];

  if (pointsToAward === undefined) {
    console.error(`points-helper: Unknown action type: ${actionType}`);
    return { success: false, error: 'Unknown action type' };
  }

  try {
    const currentBalance = await getCurrentPointsBalance(actionType, referenceType, referenceId, userId);

    if (currentBalance === null) {
      return { success: false, error: 'Failed to check current balance' };
    }

    if (currentBalance > 0) {
      return { success: false, duplicate: true };
    }

    const { data, error } = await supabase
      .from('points_events')
      .insert({
        user_id: userId,
        action_type: actionType,
        reference_type: referenceType,
        reference_id: referenceId,
        points_delta: pointsToAward
      })
      .select()
      .single();

    if (error) {
      console.error('points-helper: Error inserting points event:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('points-helper: Exception in awardPoints:', err);
    return { success: false, error: err };
  }
}

export async function reversePoints(actionType, referenceType, referenceId, userId) {
  if (!userId) {
    console.error('points-helper: Cannot reverse points without userId');
    return { success: false, error: 'Missing userId' };
  }

  const pointsToReverse = POINT_VALUES[actionType];

  if (pointsToReverse === undefined) {
    console.error(`points-helper: Unknown action type: ${actionType}`);
    return { success: false, error: 'Unknown action type' };
  }

  try {
    const currentBalance = await getCurrentPointsBalance(actionType, referenceType, referenceId, userId);

    if (currentBalance === null) {
      return { success: false, error: 'Failed to check current balance' };
    }

    if (currentBalance <= 0) {
      return { success: false, notFound: true };
    }

    const { data, error } = await supabase
      .from('points_events')
      .insert({
        user_id: userId,
        action_type: actionType,
        reference_type: referenceType,
        reference_id: referenceId,
        points_delta: -pointsToReverse
      })
      .select()
      .single();

    if (error) {
      console.error('points-helper: Error inserting reversal event:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('points-helper: Exception in reversePoints:', err);
    return { success: false, error: err };
  }
}

export async function awardUpvotePoints(contentAuthorId, contentType, contentId, voterId) {
  const actionType = contentType === 'thread' ? 'thread_upvote_received' : 'reply_upvote_received';
  const referenceType = actionType;
  const referenceId = `${contentId}:${voterId}`;

  return await awardPoints(actionType, referenceType, referenceId, contentAuthorId);
}

export async function reverseUpvotePoints(contentAuthorId, contentType, contentId, voterId) {
  const actionType = contentType === 'thread' ? 'thread_upvote_received' : 'reply_upvote_received';
  const referenceType = actionType;
  const referenceId = `${contentId}:${voterId}`;

  return await reversePoints(actionType, referenceType, referenceId, contentAuthorId);
}