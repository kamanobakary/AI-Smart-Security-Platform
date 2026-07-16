import { supabase } from './supabase';

const seedUsers = [
  {
    email: 'admin@aisecurity.io',
    password: 'demo123456',
    fullName: 'Abou Kamano',
    role: 'admin',
    department: 'Sécurité',
  },
];

export async function initializeUsers() {
  try {
    for (const user of seedUsers) {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (existing) {
        console.log(`User ${user.email} already exists`);
        continue;
      }

      // Create auth user
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role,
        },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError);
        continue;
      }

      if (data?.user) {
        console.log(`User ${user.email} created successfully`);
      }
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}
