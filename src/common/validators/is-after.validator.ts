import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'

export function IsAfter(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints
          const relatedValue = (args.object as any)[relatedPropertyName]

          if (!value || !relatedValue) {
            // Let @IsOptional handle missing values
            return true
          }

          // Parse HH:MM format
          const parseTime = (timeString: string) => {
            const [hours, minutes] = timeString.split(':').map(Number)
            return hours * 60 + minutes
          }

          return parseTime(value) > parseTime(relatedValue)
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints
          return `${args.property} must be strictly after ${relatedPropertyName}`
        },
      },
    })
  }
}
