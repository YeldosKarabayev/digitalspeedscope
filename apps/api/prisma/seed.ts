import "dotenv/config";
import { PrismaClient, MeasurementStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";



function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in apps/api/.env");

  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma: any = new PrismaClient({ adapter: adapter as any });

  return { prisma, pool };
}

function pickStatus(download: number, ping: number) {
  if (ping <= 18 && download >= 300) return MeasurementStatus.EXCELLENT;
  if (ping <= 30 && download >= 150) return MeasurementStatus.GOOD;
  if (ping <= 45 && download >= 90) return MeasurementStatus.FAIR;
  return MeasurementStatus.POOR;
}

async function main() {
  const { prisma, pool } = makeClient();

  const adminEmail = "admin@digitalspeedscope.local";
  const adminPass = "admin123";

  const passwordHash = await bcrypt.hash(adminPass, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN", isActive: true, name: "Admin" },
    create: { email: adminEmail, passwordHash, role: "ADMIN", isActive: true, name: "Admin" },
  });

  console.log("✅ Admin:", adminEmail, adminPass);


  try {
    const [almaty, astana, shymkent] = await Promise.all([
      prisma.city.upsert({ where: { name: "Алматы" }, update: {}, create: { name: "Алматы" } }),
      prisma.city.upsert({ where: { name: "Астана" }, update: {}, create: { name: "Астана" } }),
      prisma.city.upsert({ where: { name: "Шымкент" }, update: {}, create: { name: "Шымкент" } }),
    ]);

    const fixtures = [
      { uid: "MKT-ALM-012", isp: "DigitalNet", cityId: almaty.id, pointName: "Алматы · Центр", lat: "43.238949", lng: "76.889709" },
      { uid: "MKT-ALM-021", isp: "KazFiber", cityId: almaty.id, pointName: "Алматы · Восток", lat: "43.256540", lng: "76.928480" },
      { uid: "MKT-ALM-034", isp: "CityLink", cityId: almaty.id, pointName: "Алматы · Юг", lat: "43.205000", lng: "76.850000" },
      { uid: "MKT-AST-014", isp: "DigitalNet", cityId: astana.id, pointName: "Астана · Левый берег", lat: "51.128200", lng: "71.430400" },
      { uid: "MKT-SHY-002", isp: "KazFiber", cityId: shymkent.id, pointName: "Шымкент · Центр", lat: "42.315500", lng: "69.586900" },
    ];

    for (const f of fixtures) {
      const device = await prisma.device.upsert({
        where: { uid: f.uid },
        update: { isp: f.isp, name: f.pointName, isActive: true },
        create: { uid: f.uid, isp: f.isp, name: f.pointName, isActive: true },
      });

      const point = await prisma.point.upsert({
        where: { deviceId: device.id },
        update: { name: f.pointName, cityId: f.cityId, lat: f.lat, lng: f.lng },
        create: { name: f.pointName, cityId: f.cityId, deviceId: device.id, lat: f.lat, lng: f.lng },
      });

      await prisma.measurement.deleteMany({ where: { deviceId: device.id } });

      const now = Date.now();
      const count = 18;

      for (let i = count - 1; i >= 0; i--) {
        const baseDl = f.uid.includes("ALM") ? 420 : f.uid.includes("AST") ? 280 : 220;
        const baseUl = f.uid.includes("ALM") ? 110 : f.uid.includes("AST") ? 85 : 60;
        const basePg = f.uid.includes("ALM") ? 18 : f.uid.includes("AST") ? 24 : 30;

        const download = Math.max(40, Math.round(baseDl + (Math.random() - 0.45) * 220));
        const upload = Math.max(10, Math.round(baseUl + (Math.random() - 0.45) * 70));
        const ping = Math.max(5, Math.round(basePg + (Math.random() - 0.5) * 22));
        const status = pickStatus(download, ping);

        await prisma.measurement.create({
          data: {
            deviceId: device.id,
            pointId: point.id,
            downloadMbps: download,
            uploadMbps: upload,
            pingMs: ping,
            status,
            createdAt: new Date(now - i * 60 * 60 * 1000),
          },
        });
      }
    }

    const [cities, devices, points, measurements] = await Promise.all([
      prisma.city.count(),
      prisma.device.count(),
      prisma.point.count(),
      prisma.measurement.count(),
    ]);

    console.log("✅ Seed done:", { cities, devices, points, measurements });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
