import "dotenv/config"
import { PrismaClient } from "@/generated/prisma/client"

const prisma = new PrismaClient()

async function main() {
  const audits = await prisma.audit.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      url: true,
      domain: true,
      score: true,
      status: true,
      createdAt: true,
    }
  })
  console.log(JSON.stringify(audits, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
