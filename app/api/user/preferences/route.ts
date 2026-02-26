import { NextRequest } from 'next/server';
import { validatePreferencesUpdate, ValidationError } from '@/utils/validation/preferences-validation';
import { DEFAULT_PREFERENCES } from '@/utils/constants/supported-values';
import { UserPreferences } from '@/utils/types/user.types';
import { jsonSuccess, jsonError } from '@/lib/api/types';

import { withApiLogging } from '@/lib/api-logging';
// In-memory storage for demo purposes (replace with actual database in production)
let userPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };

export const PATCH = withApiLogging(async async request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    validatePreferencesUpdate(body);

    // Update preferences with validated data
    userPreferences = {
      ...userPreferences,
      ...body,
    };

    return jsonSuccess(userPreferences);
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonError('VALIDATION_ERROR', error.message);
    }
    return jsonError('INTERNAL_ERROR', 'Internal server error');
  }
}

export const GET = withApiLogging(async async ) {
  return jsonSuccess(userPreferences);
}
