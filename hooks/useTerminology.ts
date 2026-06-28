import { useAuth } from '@/contexts/AuthContext';
import { getTerminology } from '@/lib/terminology';

export function useTerminology() {
  const { profile } = useAuth();
  return getTerminology(profile?.business_type);
}
