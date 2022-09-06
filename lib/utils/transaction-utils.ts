import { Session, Transaction } from 'neo4j-driver';

export async function transaction<Result>(
  session: Session,
  uow: (c: Transaction) => Promise<Result>,
  onError?: (e: Error) => Promise<void>,
  throwOnError = true,
): Promise<Result> {
  const tx = session.beginTransaction();

  try {
    const result = await uow(tx);

    await tx.commit();

    return result;
  } catch (err) {
    if (onError) {
      await onError(err);
    }
    await tx.rollback();
    if (throwOnError) throw err;
  } finally {
    await tx.close();
  }
}
