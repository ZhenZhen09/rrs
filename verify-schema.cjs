const { resequenceSchema } = require('./server/schemas/requestSchema');

const validData = {
  riderId: 'rider123',
  sequence: ['req1', 'req2'],
  note: 'test note'
};

const invalidData = {
  riderId: '',
  sequence: [],
};

try {
  resequenceSchema.parse(validData);
  console.log('Valid data parsed successfully');
} catch (e) {
  console.error('Failed to parse valid data:', e.errors);
}

try {
  resequenceSchema.parse(invalidData);
  console.log('Invalid data parsed successfully (SHOULD NOT HAPPEN)');
} catch (e) {
  console.log('Invalid data failed to parse correctly (EXPECTED)');
}
