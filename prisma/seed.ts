import { PrismaClient, type Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const roleSeeds: Array<{ role: Role; email: string; password: string; name: string }> = [
    { role: "ADMIN", email: "admin@mcfmp.com", password: "admin123", name: "Admin" },
    { role: "MANAGER", email: "manager@mcfmp.com", password: "manager123", name: "Manager" },
    { role: "COLLECTOR", email: "collector@mcfmp.com", password: "collector123", name: "Collector" },
    { role: "CREDIT_COMMITTEE", email: "committee@mcfmp.com", password: "committee123", name: "Credit Committee" },
    { role: "BOARD_OF_DIRECTORS", email: "board@mcfmp.com", password: "board123", name: "Board of Directors" },
    { role: "TREASURER", email: "treasurer@mcfmp.com", password: "treasurer123", name: "Treasurer" },
    { role: "LOANS_CLERK", email: "loansclerk@mcfmp.com", password: "loansclerk123", name: "Loans Clerk" },
    { role: "DISBURSING_STAFF", email: "disbursing@mcfmp.com", password: "disbursing123", name: "Disbursing Staff" },
    { role: "CASHIER", email: "cashier@mcfmp.com", password: "cashier123", name: "Cashier" },
    { role: "MEMBER", email: "member@mcfmp.com", password: "member123", name: "Juan Dela Cruz" },
  ]

  for (const r of roleSeeds) {
    const passwordHash = await bcrypt.hash(r.password, 10)
    await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.name, role: r.role },
      create: {
        email: r.email,
        name: r.name,
        passwordHash,
        role: r.role,
      },
    })
  }
  console.log(`Seeded users for ${roleSeeds.length} roles.`)

  const memberUser = await prisma.user.findUnique({
    where: { email: "member@mcfmp.com" },
  })
  if (!memberUser) throw new Error("Member user seed missing")

  const member = await prisma.member.upsert({
    where: { memberNo: "MCF-001" },
    update: {},
    create: {
      memberNo: "MCF-001",
      name: "Juan Dela Cruz",
      address: "Sample Address, City",
      contactNo: "09171234567",
      religion: "Christian",
      occupation: "Fisherfolk",
      cbu: 25000,
      isRegularMember: true,
      userId: memberUser.id,
    },
  })
  console.log("Member:", member.memberNo)

  await prisma.member.upsert({
    where: { memberNo: "MCF-002" },
    update: {},
    create: {
      memberNo: "MCF-002",
      name: "Maria Santos",
      address: "Sample Address 2",
      contactNo: "09187654321",
      cbu: 30000,
      isRegularMember: true,
    },
  })

  const app = await prisma.loanApplication.upsert({
    where: { applicationNo: "APP-00001" },
    update: {},
    create: {
      applicationNo: "APP-00001",
      memberId: member.id,
      loanType: "REGULAR_LOAN",
      amount: 15000,
      termMonths: 6,
      purpose: "Working capital",
      status: "APPROVED",
      submittedAt: new Date(),
      approvedAt: new Date(),
    },
  })

  const loanCount = await prisma.loan.count()
  if (loanCount === 0) {
    const loan = await prisma.loan.create({
      data: {
        loanNo: "LN-00001",
        loanType: "REGULAR_LOAN",
        principalAmount: 15000,
        interestRate: 0.03,
        termMonths: 6,
        amortizationType: "MONTHLY",
        outstandingBalance: 12000,
        status: "ACTIVE",
        applicationId: app.id,
        memberId: member.id,
        releasedAt: new Date(),
        amortizationSchedule: {
          create: [
            {
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              principal: 2500,
              interest: 450,
              totalDue: 2950,
              penalty: 0,
              sequence: 1,
            },
            {
              dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              principal: 2500,
              interest: 375,
              totalDue: 2875,
              penalty: 0,
              sequence: 2,
            },
          ],
        },
      },
    })
    console.log("Sample loan:", loan.loanNo)
  }

  console.log("Seed completed.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
