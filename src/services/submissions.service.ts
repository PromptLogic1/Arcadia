/**
 * Submissions Service
 *
 * Pure functions for code challenge submission operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, Json } from '@/types/database.types';
import type { ServiceResponse } from '@/lib/service-types';
import { createServiceSuccess, createServiceError } from '@/lib/service-types';
import { log } from '@/lib/logger';

export type Submission = Tables<'submissions'>;
export type SubmissionStatus = Tables<'submissions'>['status'];

export interface CreateSubmissionData {
  challenge_id: string;
  user_id: string;
  code: string;
  language: string;
}

export interface SubmissionWithChallenge extends Submission {
  challenge?: {
    title: string;
    difficulty: string;
  } | null;
}

export interface SubmissionsFilters {
  challenge_id?: string;
  user_id?: string;
}

export const submissionsService = {
  /**
   * Create a new submission
   */
  async createSubmission(
    data: CreateSubmissionData
  ): Promise<ServiceResponse<Submission>> {
    try {
      const supabase = createClient();

      const { data: submission, error } = await supabase
        .from('submissions')
        .insert({
          challenge_id: data.challenge_id,
          user_id: data.user_id,
          code: data.code,
          language: data.language,
          status: 'pending',
          results: null,
        })
        .select()
        .single();

      if (error) {
        log.error('Failed to create submission', error, {
          metadata: { challengeId: data.challenge_id, userId: data.user_id },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(submission);
    } catch (error) {
      log.error('Unexpected error in createSubmission', error, {
        metadata: { data },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to create submission'
      );
    }
  },

  /**
   * Get submissions with optional filtering
   */
  async getSubmissions(
    filters: SubmissionsFilters = {}
  ): Promise<ServiceResponse<SubmissionWithChallenge[]>> {
    try {
      const supabase = createClient();

      let query = supabase
        .from('submissions')
        .select(
          `
          *,
          challenge:challenges(title, difficulty)
        `
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.challenge_id) {
        query = query.eq('challenge_id', filters.challenge_id);
      }

      const { data, error } = await query;

      if (error) {
        log.error('Failed to fetch submissions', error, {
          metadata: { filters },
        });
        return createServiceError(error.message);
      }

      // Transform data to handle null challenge
      const submissions: SubmissionWithChallenge[] = (data || []).map(item => ({
        ...item,
        challenge: item.challenge
          ? {
              title: item.challenge.title,
              difficulty: item.challenge.difficulty,
            }
          : undefined,
      }));

      return createServiceSuccess(submissions);
    } catch (error) {
      log.error('Unexpected error in getSubmissions', error, {
        metadata: { filters },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to fetch submissions'
      );
    }
  },

  /**
   * Get submission by ID
   */
  async getSubmissionById(
    submissionId: string
  ): Promise<ServiceResponse<SubmissionWithChallenge>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('submissions')
        .select(
          `
          *,
          challenge:challenges(title, difficulty)
        `
        )
        .eq('id', submissionId)
        .single();

      if (error) {
        log.error('Failed to fetch submission by ID', error, {
          metadata: { submissionId },
        });
        return createServiceError(error.message);
      }

      // Transform data to handle null challenge
      const submission: SubmissionWithChallenge = {
        ...data,
        challenge: data.challenge
          ? {
              title: data.challenge.title,
              difficulty: data.challenge.difficulty,
            }
          : undefined,
      };

      return createServiceSuccess(submission);
    } catch (error) {
      log.error('Unexpected error in getSubmissionById', error, {
        metadata: { submissionId },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to fetch submission'
      );
    }
  },

  /**
   * Update submission status and results
   */
  async updateSubmissionResults(
    submissionId: string,
    status: SubmissionStatus,
    results?: Json
  ): Promise<ServiceResponse<Submission>> {
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('submissions')
        .update({
          status,
          results,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        log.error('Failed to update submission results', error, {
          metadata: { submissionId, status },
        });
        return createServiceError(error.message);
      }

      return createServiceSuccess(data);
    } catch (error) {
      log.error('Unexpected error in updateSubmissionResults', error, {
        metadata: { submissionId, status },
      });
      return createServiceError(
        error instanceof Error ? error.message : 'Failed to update submission'
      );
    }
  },
};
