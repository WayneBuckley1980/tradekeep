import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

type AuthTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  code?: string | null;
  error?: string | null;
  error_description?: string | null;
};

function readSearchParams(part: string): AuthTokens {
  const params = new URLSearchParams(part);

  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    code: params.get('code'),
    error: params.get('error'),
    error_description: params.get('error_description'),
  };
}

function parseParamsFromUrl(url: string): AuthTokens {
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    return readSearchParams(url.slice(hashIndex + 1));
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    return readSearchParams(url.slice(queryIndex + 1));
  }

  return {};
}

export async function createSessionFromUrl(url: string) {
  const { access_token, refresh_token, code, error, error_description } = parseParamsFromUrl(url);

  if (error) {
    throw new Error(error_description ?? error);
  }

  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return data.session;
  }

  if (access_token && refresh_token) {
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (sessionError) throw sessionError;
    return data.session;
  }

  throw new Error('No auth credentials found in the magic link.');
}

export async function getAuthCallbackUrl() {
  return Linking.getInitialURL();
}
