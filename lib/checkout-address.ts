import { z } from 'zod';
export const INDIA_STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'] as const;
export const checkoutAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  addressLine1: z.string().trim().min(1).max(300),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.enum(INDIA_STATES),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
  country: z.literal('India'),
});
