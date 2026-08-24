// Redefine a senha de um usuário JÁ existente pela linha de comando.
//   npm run reset-password -- <usuário> <nova-senha>
// Local usa .env; no Railway: `railway run npm run reset-password -- ...`.
// (Para criar um usuário novo use `create-admin`; este script só atualiza.)
import { changePassword } from '../auth/service';
import { closeDb, getPool } from '../db/pool';

async function main(): Promise<void> {
  const [identifier, password] = process.argv.slice(2);
  if (!identifier || !password) {
    console.error('uso: npm run reset-password -- <usuário> <nova-senha>');
    process.exit(1);
  }
  // Mesma regra mínima da rota POST /auth/password.
  if (password.length < 8) {
    throw new Error('A senha deve ter no mínimo 8 caracteres.');
  }

  // O identificador é normalizado igual ao login (trim + lowercase).
  const email = identifier.trim().toLowerCase();
  const { rows } = await getPool().query('select id from public.users where email = $1', [
    email,
  ]);
  const user = rows[0] as { id: string } | undefined;
  if (!user) throw new Error(`Usuário não encontrado: ${email}`);

  await changePassword(user.id, password);
  console.log(`senha redefinida: ${email}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err instanceof Error ? err.message : err);
    await closeDb().catch(() => {});
    process.exit(1);
  });
