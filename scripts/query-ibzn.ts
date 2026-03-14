import "dotenv/config"
import { PrismaClient } from "@/generated/prisma/client"
const prisma = new PrismaClient()

async function main() {
  const audits = await prisma.audit.findMany({
    where: {
      domain: { contains: 'ibzn', mode: 'insensitive' }
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })
  if (audits.length > 0) {
    const a = audits[0]
    console.log('URL:', a.url)
    console.log('Score:', a.score)
    console.log('Technical:', JSON.stringify(a.technical, null, 2)?.slice(0, 1000))
    console.log('Content:', JSON.stringify(a.content, null, 2)?.slice(0, 500))
    console.log('Links:', JSON.stringify(a.links, null, 2)?.slice(0, 500))
  } else {
    console.log('No IBZN audit found')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
