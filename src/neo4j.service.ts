import { Injectable, Inject, OnApplicationShutdown } from '@nestjs/common';
import neo4j, { Driver, int, Transaction, QueryResult } from 'neo4j-driver'
import { Neo4jConnection } from './interfaces/neo4j-connection.interface';
import { NEO4J_OPTIONS, NEO4J_DRIVER } from './neo4j.constants';
import TransactionImpl from 'neo4j-driver-core/lib/transaction'

@Injectable()
export class Neo4jService implements OnApplicationShutdown  {

    private readonly driver: Driver;
    private readonly connection: Neo4jConnection;

    constructor(
        @Inject(NEO4J_OPTIONS) config: Neo4jConnection,
        @Inject(NEO4J_DRIVER) driver: Driver
    ) {
        this.driver = driver
        this.connection = config
    }

    getDriver(): Driver {
        return this.driver;
    }

    getConfig(): Neo4jConnection {
        return this.connection;
    }

    int(value: number) {
        return int(value)
    }

    beginTransaction(database?: string): Transaction {
        const session = this.getWriteSession(database)

        return session.beginTransaction()
    }

    getReadSession(database?: string) {
        return this.driver.session({
            database: database || this.connection.database,
            defaultAccessMode: neo4j.session.READ,
        })
    }

    getWriteSession(database?: string) {
        return this.driver.session({
            database: database || this.connection.database,
            defaultAccessMode: neo4j.session.WRITE,
        })
    }

    async read(cypher: string, params?: Record<string, any>, databaseOrTransaction?: string | Transaction): Promise<QueryResult> {
        if ( databaseOrTransaction instanceof TransactionImpl ) {
            return (<Transaction> databaseOrTransaction).run(cypher, params)
        }

        const session = this.getReadSession(<string> databaseOrTransaction)
        const res = await session.executeRead(tx => tx.run(cypher, params))

        await session.close()

        return res
    }

    async write(cypher: string, params?: Record<string, any>,  databaseOrTransaction?: string | Transaction): Promise<QueryResult> {
        if ( databaseOrTransaction instanceof TransactionImpl ) {
            return (<Transaction> databaseOrTransaction).run(cypher, params)
        }

        const session = this.getWriteSession(<string> databaseOrTransaction)
        const res = await session.executeWrite(tx => tx.run(cypher, params))

        await session.close()

        return res
    }

    transaction = async (
        run?: (_: Transaction) => Promise<void>,
        onCommitError?: (error: Error) => Promise<void>,
      ) => {
        const session = this.getWriteSession()
        const tx = await session.beginTransaction()
        try {
          await run(tx)
          try {
            await tx.commit()
          } catch (error) {
            if (onCommitError) await onCommitError(error)
            throw error // roll back
          }
        } finally {
          await tx.close() // rolls back if not yet committed
          await session.close()
        }
      }
    
    onApplicationShutdown() {
        return this.driver.close()
    }
}
