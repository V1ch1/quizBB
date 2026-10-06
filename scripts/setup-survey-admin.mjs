// Generates credentials locally; never prints passwords or writes tracked files.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
const envPath = '.env.local';
if (existsSync(envPath) && /^SURVEY_ADMIN_/m.test(readFileSync(envPath, 'utf8'))) throw new Error('Survey credentials already exist; refusing to overwrite.');
if (existsSync('.data/survey-admin-access.txt')) throw new Error('Credential file already exists; refusing to overwrite.');
const username = 'cosnor';
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const secret = randomBytes(48).toString('base64url');
appendFileSync(envPath, `\nSURVEY_ADMIN_USER=${username}\nSURVEY_ADMIN_PASSWORD_HASH=${hash}\nSURVEY_SESSION_SECRET=${secret}\n`, { mode: 0o600 });
mkdirSync('.data', { recursive: true });
writeFileSync('.data/survey-admin-access.txt', `Panel de consulta de Cosnor\nUsuario: ${username}\nContraseña: ${password}\n\nLocal: http://localhost:3000/encuesta/acceso\nProducción (tras desplegar y configurar): https://cosnor.blancoyenbatea.com/encuesta/acceso\n\nCompartir solo con la persona autorizada. Este archivo no se sube a Git.\n`, { mode: 0o600 });
console.log('Credenciales generadas en .data/survey-admin-access.txt; configuración añadida a .env.local.');
