import { DataTypes } from "sequelize";
import _Organisations from "./Organisations.js";
import _People from "./People.js";
import _VisitorVisits from "./VisitorVisits.js";
import _Visitors from "./Visitors.js";
import _Users from "./Users.js";

export function initModels(sequelize) {
  var Organisations = _Organisations(sequelize, DataTypes);
  var People = _People(sequelize, DataTypes);
  var VisitorVisits = _VisitorVisits(sequelize, DataTypes);
  var Visitors = _Visitors(sequelize, DataTypes);
  var Users = _Users(sequelize, DataTypes);

  People.belongsTo(Organisations, { as: "organisation", foreignKey: "organisation_id"});
  Organisations.hasMany(People, { as: "people", foreignKey: "organisation_id"});
  VisitorVisits.belongsTo(Organisations, { as: "organisation", foreignKey: "organisation_id"});
  Organisations.hasMany(VisitorVisits, { as: "visitor_visits", foreignKey: "organisation_id"});
  Visitors.belongsTo(Organisations, { as: "organisation", foreignKey: "organisation_id"});
  Organisations.hasMany(Visitors, { as: "visitors", foreignKey: "organisation_id"});
  VisitorVisits.belongsTo(People, { as: "host", foreignKey: "host_id"});
  People.hasMany(VisitorVisits, { as: "visitor_visits", foreignKey: "host_id"});
  VisitorVisits.belongsTo(Visitors, { as: "visitor", foreignKey: "visitor_id"});
  Visitors.hasMany(VisitorVisits, { as: "visitor_visits", foreignKey: "visitor_id"});

  Users.belongsTo(Organisations, { as: "organisation", foreignKey: "organisation_id" });
  Organisations.hasMany(Users, { as: "users", foreignKey: "organisation_id" });

  return {
    Organisations,
    People,
    VisitorVisits,
    Visitors,
    Users,
  };
}
export default initModels;
