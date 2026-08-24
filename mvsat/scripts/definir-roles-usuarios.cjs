const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	projectId: 'mvsat-428a2'
});

const db = admin.firestore();

const USERS_TO_SET = [
	{ email: 'augusto1989@gmail.com', role: 'admin' },
	{ email: 'moisestimesky@gmail.com', role: 'admin' }
];

async function upsertEmployeeAndPermissions(uid, email, cargo) {
	const empQuery = await db.collection('employees').where('email', '==', email).get();
	let empRef;
	if (!empQuery.empty) {
		empRef = empQuery.docs[0].ref;
		await empRef.set({ email, cargo }, { merge: true });
	} else {
		empRef = db.collection('employees').doc(uid);
		await empRef.set({ email, cargo });
	}

	const fullPerms = {
		permissions: {
			clientes: { view: true, create: true, update: true, delete: true },
			tvbox: { view: true, create: true, update: true, delete: true },
			assinaturas: { view: true, create: true, update: true, delete: true },
			equipamentos: { view: true, create: true, update: true, delete: true },
			cobrancas: { view: true, create: true, update: true, delete: true },
			despesas: { view: true, create: true, update: true, delete: true },
			dashboard: { view: true },
			funcionarios: { view: true, create: true, update: true, delete: true, manage_settings: true }
		},
		lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
		updatedBy: 'script-claims'
	};
	await db.collection('employee_permissions').doc(empRef.id).set(fullPerms, { merge: true });
}

async function main() {
	try {
		console.log('🔐 Definindo roles e preparando employees/permissões...\n');
		for (const { email, role } of USERS_TO_SET) {
			try {
				const user = await admin.auth().getUserByEmail(email);
				const claims = { ...(user.customClaims || {}), role };
				await admin.auth().setCustomUserClaims(user.uid, claims);
				console.log(`✅ Claims set para ${email}:`, claims);
				await upsertEmployeeAndPermissions(user.uid, email, role);
				console.log(`✅ Employees/Permissions atualizados para ${email} (cargo: ${role})`);
			} catch (err) {
				console.error(`❌ Falha ao definir para ${email}:`, err.message);
			}
		}
		console.log('\n🎯 Concluído. Faça logout/login no app para renovar o token.');
	} catch (e) {
		console.error('Erro geral:', e);
	} finally {
		process.exit(0);
	}
}

main();



