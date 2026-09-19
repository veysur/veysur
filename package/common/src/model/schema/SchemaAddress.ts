import Schema, { sb } from 'mzen-schema'

export class SchemaAddress extends Schema {
  constructor() {
    super(
      sb
        .schema('address')
        .construct('Address')
        .strict()
        .shape({
          _id: sb.string().required(),
          buildingNum: sb.string().maxLength(30),
          buildingName: sb.string().maxLength(140),
          street: sb.string().maxLength(140),
          block: sb.string().maxLength(30),
          floor: sb.string().maxLength(30),
          unit: sb.string().maxLength(30),
          city: sb.string().maxLength(140),
          postcode: sb.string().maxLength(30),
          country: sb.string().maxLength(70),
          instructions: sb.string().maxLength(300),
          location: sb.object({
            type: sb.string(),
            coordinates: sb.array(Number),
          }),
        })
        .build(),
    )
  }
}

export default SchemaAddress
