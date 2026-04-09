import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://eibtfztgxfivvkmsjarq.supabase.co' // Pegue no menu Data API
const supabaseAnonKey = 'sb_publishable_iAZmXewR1Fi1A_ZRxx2ABQ__ip-E7Hk'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)