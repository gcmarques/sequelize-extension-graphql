const extendSequelize = require('sequelize-extension');
const connection = require('../helpers/connection');
const dropAll = require('../helpers/dropAll');
const GraphQLToolsSequelize = require('graphql-tools-sequelize');
const enhanceGraphql = require('../..');

describe('enhancers', () => {
  let sequelize;
  let db;

  const reset = async () => {
    await dropAll(sequelize);
    db = {};
    db.user = sequelize.define('user', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
      },
      username: sequelize.Sequelize.STRING(255),
      bio: sequelize.Sequelize.TEXT('long'),
      balance: sequelize.Sequelize.DECIMAL(11, 2),
      profile: {
        allowNull: true,
        type: sequelize.Sequelize.ENUM('VISITOR', 'USER'),
        defaultValue: 'VISITOR',
      },
    });
    await sequelize.sync();
  };

  after(async () => {
    await sequelize.close();
  });

  describe('-> graphql', () => {
    it('should return the schema correcly with gts', async () => {
      sequelize = connection();
      await reset();
      const gts = new GraphQLToolsSequelize(sequelize, { idtype: 'ID' });
      await gts.boot();
      db.user.mutations = {};
      db.user.mutations.update = false;
      db.user.mutations.delete = {
        input: `
          input TestInput {
            deletedBy: Int
          }
        `,
        schema: `
          # Test schema
          delete(with: TestInput!): user
        `,
        resolver: async (user, input) => {
          if (user) {
            user.deletedBy = input.deletedBy;
            await user.save();
            await user.destroy();
          }
          return user;
        },
      };
      db.user.queries = {};
      db.user.queries.list = false;
      extendSequelize(db, {
        graphql: enhanceGraphql({ gts }),
      });
      expect(db.getGraphQLExecutableSchema()).to.be.an.string;
    });

    it('should return the schema correcly without gts', async () => {
      sequelize = connection();
      await reset();
      extendSequelize(db, {
        graphql: enhanceGraphql(),
      });
      expect(db.getGraphQLExecutableSchema()).to.be.an.string;
    });

    it('should allow custom functions', async () => {
      sequelize = connection();
      await reset();
      db.user.mutations = {};
      db.user.mutations.custom = {
        input: `
          input CustomMutation {
            type: String
          }
        `,
        schema: `
          # Custom mutations
          custom(with: CustomMutation!): JSON!
        `,
        resolver: async () => ({}),
      };
      db.user.queries = {};
      db.user.queries.custom = {
        input: `
          input CustomQuery {
            type: String
          }
        `,
        schema: `
          # Custom queries
          custom(with: CustomQuery!): JSON!
        `,
        resolver: async () => ({}),
      };
      extendSequelize(db, {
        graphql: enhanceGraphql(),
      });
      expect(db.getGraphQLExecutableSchema()).to.be.an.string;
    });
  });
});
