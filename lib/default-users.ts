import { CookPerson } from "@prisma/client";

import { DEFAULT_USER_EMAILS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultUsers() {
  await prisma.user.upsert({
    where: { person: CookPerson.ELIM },
    update: {},
    create: { email: DEFAULT_USER_EMAILS.ELIM, name: "Elim", person: CookPerson.ELIM },
  });

  await prisma.user.upsert({
    where: { person: CookPerson.THOMAS },
    update: {},
    create: { email: DEFAULT_USER_EMAILS.THOMAS, name: "Thomas", person: CookPerson.THOMAS },
  });
}

export async function getUserIdForPerson(person: CookPerson) {
  await ensureDefaultUsers();
  const user = await prisma.user.findUniqueOrThrow({ where: { person } });
  return user.id;
}
