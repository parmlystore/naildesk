import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uwafsgovfvpvpaqkkkwb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7-4_wvMJ5SoMdQ6u1Kl-Iw_fShKZTPH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
