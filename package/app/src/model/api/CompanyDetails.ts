export interface CompanyDetails {
  legalName: string
  companyNumber: string
  companyVatNumber?: string
  companyOssVatNumber?: string
  addressLines: string[]
  supportEmail?: string
}
