// Cria o primeiro administrador (ou qualquer admin) pela linha de comando.
//   npm run create-admin -- <email> <senha> [nome]
// Local usa .env; no Railway: `railway run npm run create-admin -- ...`.
import { createUser, AuthError } from '../auth/service';
import { closeDb } from '../db/pool';

async function main(): Promise<void> {
  const [email, password, ...nameParts] = process.argv.slice(2);
  if (!email || !password) {
    console.error('uso: npm run create-admin -- <email> <senha> [nome]');
    process.exit(1);
  }
  const name = nameParts.join(' ') || email.split('@')[0]!;
  const profile = await createUser({ email, password, name, role: 'admin' });
  console.log(`admin criado: ${profile.email} (${profile.id})`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    if (err instanceof AuthError && err.code === 'email-taken') {
      console.error('Já existe um usuário com esse e-mail.');
    } else {
      console.error(err instanceof Error ? err.message : err);
    }
    await closeDb().catch(() => {});
    process.exit(1);
  });
