/**
 * Submissions Service
 *
 * Pure functions for code challenge submission operations.
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { Tables, Json } from '@/types/database-generated';

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
  ): Promise<{ submission: Submission | null; error?: string }> {
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
        return { submission: null, error: error.message };
      }

      return { submission };
    } catch (error) {
      return {
        submission: null,
        error: error instanceof Error ? error.message : 'Failed to create submission',
      };
    }
  },

  /**
   * Get submissions with optional filtering
   */
  async getSubmissions(
    filters: SubmissionsFilters = {}
  ): Promise<{ submissions: SubmissionWithChallenge[]; error?: string }> {
    try {
      const supabase = createClient();
      
      let query = supabase
        .from('submissions')
        .select(`
          *,
          challenge:challenges(title, difficulty)
        `)
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
        return { submissions: [], error: error.message };
      }

      // Transform data to handle null challenge
      const submissions: SubmissionWithChallenge[] = (data || []).map(item => ({
        ...item,
        challenge: item.challenge ? {
          title: item.challenge.title,
          difficulty: item.challenge.difficulty as string,
        } : undefined,
      }));

      return { submissions };
    } catch (error) {
      return {
        submissions: [],
        error: error instanceof Error ? error.message : 'Failed to fetch submissions',
      };
    }
  },

  /**
   * Get submission by ID
   */
  async getSubmissionById(
    submissionId: string
  ): Promise<{ submission: SubmissionWithChallenge | null; error?: string }> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          challenge:challenges(title, difficulty)
        `)
        .eq('id', submissionId)
        .single();

      if (error) {
        return { submission: null, error: error.message };
      }

      // Transform data to handle null challenge
      const submission: SubmissionWithChallenge = {
        ...data,
        challenge: data.challenge ? {
          title: data.challenge.title,
          difficulty: data.challenge.difficulty as string,
        } : undefined,
      };

      return { submission };
    } catch (error) {
      return {
        submission: null,
        error: error instanceof Error ? error.message : 'Failed to fetch submission',
      };
    }
  },

  /**
   * Update submission status and results
   */
  async updateSubmissionResults(
    submissionId: string,
    status: SubmissionStatus,
    results?: Json
  ): Promise<{ submission: Submission | null; error?: string }> {
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
        return { submission: null, error: error.message };
      }

      return { submission: data };
    } catch (error) {
      return {
        submission: null,
        error: error instanceof Error ? error.message : 'Failed to update submission',
      };
    }
  },
};