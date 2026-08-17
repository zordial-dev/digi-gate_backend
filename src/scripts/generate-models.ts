import SequelizeAuto from 'sequelize-auto';
import dotenv from 'dotenv';

dotenv.config();

const auto = new SequelizeAuto(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASSWORD!,
  {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!),
    dialect: 'postgres',
    directory: './src/models',
    caseModel: 'p',
    caseFile: 'p',
    singularize: false,
    useDefine: true,
  }
);

auto.run()
  .then(() => {
    console.log('✅ Models generated successfully!');
  })
  .catch((err: any) => {
    console.error('❌ Error generating models:', err.message || err);
  });