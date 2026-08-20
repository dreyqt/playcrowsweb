import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type LanguageCode = 'en' | 'ko' | 'th' | 'pt' | 'zh-TW' | 'ru'

export const LANGUAGES: { code: LanguageCode; short: string; label: string }[] = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'ko', short: 'KO', label: '한국어' },
  { code: 'th', short: 'TH', label: 'ไทย' },
  { code: 'pt', short: 'PT', label: 'Português' },
  { code: 'zh-TW', short: '繁', label: '繁體中文' },
  { code: 'ru', short: 'RU', label: 'Русский' },
]

const en = {
  developmentTeam: 'by PlayCrows Development Team',
  donationSubmitted: 'Donation Form Submitted',
  donationSubmittedDesc: 'Your submission is pending review. Save the reference code below in case you need to contact PlayCrows support.',
  referenceCode: 'Reference Code',
  submitAnother: 'Submit Another Form',
  webShop: 'WEB Shop',
  supportAmount: 'Support Amount',
  cumulativeRewards: 'Cumulative Rewards',
  changePackageHint: 'Use Change Package to select another package',
  choosePackageHint: 'Choose a gift package',
  chooseSupportHint: 'Choose your currency and package quantity',
  selectPackageFirst: 'Select a gift package first',
  initialPackage: 'Selected Package',
  packageSelectionDesc: 'Choose the payment currency and quantity below.',
  changePackage: 'Change Package',
  voluntaryFooter: "© 2026 PlayCrows Development Team — All purchases support the game's longevity, continued development, and improvement.",
  promoEnded: 'The EARLY10 promotion ended on July 31, 2026 at 3:00 PM Singapore Time.',
  invalidRedeem: 'Invalid redeem code.',
  promoNotEligible: 'EARLY10 only applies to eligible gift packages.',
  promoApplied: 'EARLY10 applied. You will pay 10% less while receiving the full package and cumulative credit.',
  promoExpiredReview: 'The EARLY10 promotion has expired. Review the regular payment amount before submitting.',
  unableSubmit: 'Unable to submit the donation form. Please try again.',

  currency: 'Currency',
  supportPackages: 'Support Packages',
  augustSupplyPackages: 'August Supply Packages',
  augustSupplyPackage: 'August Supply Package',
  augustSupplyPackagesDesc: 'Limited August supply bundles with bonus resources and enhancement materials.',
  currencyDesc: 'Diamond packages currently available in the web shop.',
  supportPackagesDesc: 'Item bundles available for direct support purchases.',
  webShopIntro: 'Select a category below for an easy lookup of available packages.',
  supportPackage: 'Support Package',
  selected: 'Selected',
  select: 'Select',
  packageContinueNotice: 'Select a package to continue. Bound items cannot be traded or transferred.',
  missingIcon: 'Missing icon',
  iconUnavailable: 'icon unavailable',
  viewRewards: 'View rewards',
  close: 'Close',

  cumulativeIntro: 'Review the rewards assigned to each cumulative support milestone. Select a milestone to expand its complete reward list.',
  claimCumulative: 'Claim Cumulative Rewards',
  milestones: 'Milestones',
  startingTier: 'Starting Tier',
  highestTier: 'Highest Tier',
  cumulativeMilestone: 'Cumulative Support Milestone',
  reward: 'reward',
  rewards: 'rewards',
  cumulativeNotice: 'Cumulative reward contents are displayed by milestone. Contact PlayCrows support if you need confirmation about qualification or reward distribution.',

  stepAmount: 'Amount',
  stepPlayerInfo: 'Player Info',
  stepPayment: 'Payment',
  stepReceipt: 'Receipt',
  stepComplete: 'Complete',

  supportAmountTitle: 'Support Amount',
  supportAmountDesc: 'Choose the payment currency and how many copies of the selected package you want.',
  selectedPackage: 'Selected Package',
  each: 'each',
  quantity: 'Quantity',
  decreaseQuantity: 'Decrease quantity',
  increaseQuantity: 'Increase quantity',
  quantityExample: 'Example: quantity 10 purchases 10 copies of the selected package.',
  totalPayment: 'Total payment',
  usdEquivalent: 'USD equivalent',
  continue: 'Continue',

  playerInformation: 'Player Information',
  playerInformationDesc: 'Before you continue, please enter your PlayCrows account information. This allows us to properly identify your account and process your support contribution.',
  username: 'Username',
  loginIdPlaceholder: 'Enter your Login ID',
  characterName: 'Character name',
  characterPlaceholder: 'Enter your in-game character name',
  back: 'Back',
  continuePayment: 'Continue to Payment',

  choosePayment: 'Choose Your Payment Method',
  choosePaymentDesc: 'Select a method and follow the instructions to complete your payment.',
  amountToPay: 'Amount To Pay',
  amount: 'Amount',
  discountApplied: 'discount applied',
  redeemCode: 'Redeem Code',
  redeemDesc: 'Enter a valid promotion code before selecting your payment method.',
  enterRedeem: 'Enter redeem code',
  remove: 'Remove',
  applyCode: 'Apply Code',
  appliedSuccessfully: 'applied successfully',
  pay: 'Pay',
  receiveFullPackage: 'and receive the full package and cumulative reward credit.',
  redeemRemoved: 'Redeem code removed.',
  earlyPromotionEnded: 'The early donation promotion has ended.',
  paypalDesc: 'Pay securely using PayPal',
  gcashDesc: 'Pay using GCash',
  wiseDesc: 'Pay using Wise QR or Wisetag',
  bybitDesc: 'Internal transfer or USDT transfer through TRC20',
  paymentDetails: 'Payment Details',
  paypalCheckout: 'Checkout',
  scanGcash: 'Scan the QR code using your GCash app to complete your payment.',
  accountName: 'Account Name',
  accountNumber: 'Account Number',
  paypalInstructions: 'Important PayPal Payment Instructions',
  paypalFriendsFamily: 'When sending your payment through PayPal, please select Friends and Family if this option is available to you.',
  paypalCorrectType: 'Please make sure the payment is sent using the correct payment type before completing the transaction.',
  paypalEmail: 'PayPal Email',
  openPaypal: 'Open PayPal',
  scanWise: 'Scan the QR code using your phone or open the Wise payment link below.',
  wisetag: 'Wisetag',
  openWise: 'Open Wise Payment',
  saveScreenshotNext: 'After completing the payment, save a screenshot of the transaction and upload it in the next step.',
  chooseBybitMethod: 'Choose one Bybit transfer method',
  bybitMethodDesc: 'You may send through an internal Bybit UID transfer, or send USDT through the TRC20 network.',
  bybitInternal: 'Bybit Internal Transfer',
  bybitUidDesc: 'Use this UID when transferring from another Bybit account.',
  bybitUid: 'Bybit UID',
  or: 'Or',
  usdtOnchain: 'USDT On-Chain Transfer',
  usdtDesc: 'Scan the QR code or enter the wallet address manually.',
  asset: 'Asset',
  network: 'Network',
  walletAddress: 'Wallet Address',
  networkWarning: 'Important network warning',
  networkWarningDesc: 'Send only USDT using the TRC20 network. Using a different asset or network may result in permanent loss of funds.',
  saveTransferReceipt: 'After completing the transfer, save a screenshot of the transaction receipt and upload it in the next step.',
  continueReceipt: 'Continue to Receipt',

  uploadReceipt: 'Upload Payment Receipt',
  uploadReceiptDesc: 'Upload a clear screenshot or PDF showing the completed payment. Your receipt will be stored privately and reviewed by the PlayCrows team.',
  selectReceipt: 'Select your payment receipt',
  acceptedFormats: 'Accepted formats: JPG, PNG, WEBP, or PDF. Maximum file size: 5 MB.',
  chooseFile: 'Choose File',
  pdfSelected: 'PDF receipt selected',
  additionalNotes: 'Additional Notes',
  additionalNotesDesc: 'Add optional instructions or information for the PlayCrows team.',
  additionalNotesPlaceholder: 'Enter additional notes here...',
  receiptVisibility: 'Make sure the amount, recipient, transaction date, and transaction ID are visible whenever your payment provider shows them.',
  continueReview: 'Continue to Review',
  invalidReceiptType: 'Only JPG, PNG, WEBP, and PDF receipts are allowed.',
  invalidReceiptSize: 'The receipt must be larger than 0 bytes and no more than 5 MB.',
  receiptRequired: 'Please upload your payment receipt before continuing.',
  receiptPreview: 'Payment receipt preview',

  reviewSubmission: 'Review Your Submission',
  reviewSubmissionDesc: 'Confirm the information below before sending your donation form for review.',
  donationDetails: 'Donation Details',
  playerId: 'Player ID',
  giftPackageCredit: 'Gift Package / Cumulative Credit',
  originalPayment: 'Original Payment Amount',
  discount: 'Discount',
  selectedPackageLabel: 'Selected Package',
  notSelected: 'Not selected',
  package: 'Package',
  paymentMethod: 'Payment Method',
  paymentReceipt: 'Payment Receipt',
  notUploaded: 'Not uploaded',
  none: 'None',
  whatNext: 'What happens next?',
  whatNextDesc: 'Your submission will be marked as pending while the PlayCrows team checks the payment and receipt. Keep the reference code shown after submission.',
  cumulativeCreditDesc: 'Your cumulative reward credit will use the full gift package value, not the discounted payment amount.',
  submitting: 'Submitting…',
  submitDonation: 'Submit Donation Form',

  receiptSuccess: 'Payment Receipt Submitted Successfully!',
  thankSupport: 'Thank you for supporting PlayCrows!',
  receiptSuccessDesc: 'Your payment is now waiting for verification. Once your payment has been confirmed, your support contribution will be processed accordingly.',
  keepReceipt: 'Please keep your payment receipt until your transaction has been successfully verified.',
  anotherTransaction: 'Make Another Transaction',
} as const

type TranslationKey = keyof typeof en
type TranslationTable = Record<TranslationKey, string>

const ko: TranslationTable = {
  ...en,
  developmentTeam: 'PlayCrows 개발팀', donationSubmitted: '후원 신청이 제출되었습니다', donationSubmittedDesc: '신청이 검토 대기 중입니다. PlayCrows 지원팀에 문의할 경우를 대비해 아래 참조 코드를 보관해 주세요.', referenceCode: '참조 코드', submitAnother: '다른 신청 제출', webShop: 'WEB 상점', supportAmount: '후원 금액', cumulativeRewards: '누적 보상', changePackageHint: '다른 패키지를 선택하려면 패키지 변경을 이용하세요', choosePackageHint: '패키지를 선택하세요', chooseSupportHint: '통화와 패키지 수량을 선택하세요', selectPackageFirst: '먼저 패키지를 선택하세요', initialPackage: '선택한 패키지', packageSelectionDesc: '아래에서 결제 통화와 수량을 선택하세요.', changePackage: '패키지 변경', voluntaryFooter: '2026 PlayCrows 개발팀 - 모든 후원은 자발적인 지원입니다.',
  currency: '재화', supportPackages: '지원 패키지', augustSupplyPackages: '8월 보급 패키지', augustSupplyPackage: '8월 보급 패키지', augustSupplyPackagesDesc: '8월 한정 보급 번들로 보너스 재화와 강화 재료가 포함됩니다.', currencyDesc: 'WEB 상점에서 이용 가능한 다이아 패키지입니다.', supportPackagesDesc: '직접 후원을 위한 아이템 번들입니다.', webShopIntro: '아래 카테고리를 선택해 원하는 패키지를 빠르게 확인하세요.', supportPackage: '지원 패키지', selected: '선택됨', select: '선택', packageContinueNotice: '계속하려면 패키지를 선택하세요. 귀속 아이템은 거래하거나 이전할 수 없습니다.',
  cumulativeIntro: '누적 후원 단계별 보상을 확인하세요. 단계를 선택하면 전체 보상 목록을 볼 수 있습니다.', claimCumulative: '누적 보상 수령', milestones: '단계', startingTier: '시작 단계', highestTier: '최고 단계', cumulativeMilestone: '누적 후원 단계', reward: '보상', rewards: '보상', cumulativeNotice: '누적 보상은 단계별로 표시됩니다. 자격 또는 지급 여부 확인이 필요하면 PlayCrows 지원팀에 문의하세요.',
  stepAmount: '금액', stepPlayerInfo: '플레이어 정보', stepPayment: '결제', stepReceipt: '영수증', stepComplete: '완료',
  supportAmountTitle: '후원 금액', supportAmountDesc: '결제 통화와 선택한 패키지 구매 수량을 설정하세요.', selectedPackage: '선택한 패키지', each: '개당', quantity: '수량', decreaseQuantity: '수량 감소', increaseQuantity: '수량 증가', quantityExample: '예: 수량 10은 선택한 패키지를 10개 구매합니다.', totalPayment: '총 결제 금액', usdEquivalent: 'USD 환산', continue: '계속',
  playerInformation: '플레이어 정보', playerInformationDesc: '계속하기 전에 PlayCrows 계정 정보를 입력해 주세요. 계정을 정확히 확인하고 후원을 처리하는 데 사용됩니다.', username: '로그인 ID', loginIdPlaceholder: '로그인 ID 입력', characterName: '캐릭터 이름', characterPlaceholder: '게임 내 캐릭터 이름 입력', back: '뒤로', continuePayment: '결제로 계속',
  choosePayment: '결제 수단 선택', choosePaymentDesc: '결제 수단을 선택하고 안내에 따라 결제를 완료하세요.', amountToPay: '결제 금액', amount: '금액', discountApplied: '할인 적용', redeemCode: '프로모션 코드', redeemDesc: '결제 수단을 선택하기 전에 유효한 프로모션 코드를 입력하세요.', enterRedeem: '코드 입력', remove: '삭제', applyCode: '코드 적용', appliedSuccessfully: '적용 완료', pay: '결제', receiveFullPackage: '결제 후 전체 패키지와 누적 보상 크레딧을 받습니다.', redeemRemoved: '프로모션 코드가 삭제되었습니다.', earlyPromotionEnded: '얼리 후원 프로모션이 종료되었습니다.', paypalDesc: 'PayPal로 안전하게 결제', gcashDesc: 'GCash로 결제', wiseDesc: 'Wise QR 또는 Wisetag로 결제', bybitDesc: 'Bybit 내부 이체 또는 TRC20 USDT 전송', paymentDetails: '결제 정보', scanGcash: 'GCash 앱으로 QR 코드를 스캔해 결제를 완료하세요.', accountName: '계정명', accountNumber: '계정 번호', paypalInstructions: '중요 PayPal 결제 안내', paypalFriendsFamily: '가능한 경우 PayPal 결제 시 Friends and Family 옵션을 선택해 주세요.', paypalCorrectType: '결제를 완료하기 전에 올바른 결제 유형을 선택했는지 확인해 주세요.', paypalEmail: 'PayPal 이메일', openPaypal: 'PayPal 열기', scanWise: '휴대폰으로 QR 코드를 스캔하거나 아래 Wise 결제 링크를 이용하세요.', wisetag: 'Wisetag', openWise: 'Wise 결제 열기', saveScreenshotNext: '결제 후 거래 스크린샷을 저장하고 다음 단계에서 업로드하세요.', chooseBybitMethod: 'Bybit 전송 방식 선택', bybitMethodDesc: 'Bybit UID 내부 이체 또는 TRC20 네트워크를 통한 USDT 전송을 이용할 수 있습니다.', bybitInternal: 'Bybit 내부 이체', bybitUidDesc: '다른 Bybit 계정에서 이체할 때 이 UID를 사용하세요.', bybitUid: 'Bybit UID', or: '또는', usdtOnchain: 'USDT 온체인 전송', usdtDesc: 'QR 코드를 스캔하거나 지갑 주소를 직접 입력하세요.', asset: '자산', network: '네트워크', walletAddress: '지갑 주소', networkWarning: '중요 네트워크 주의사항', networkWarningDesc: 'TRC20 네트워크로 USDT만 전송하세요. 다른 자산이나 네트워크 사용 시 자금이 영구적으로 손실될 수 있습니다.', saveTransferReceipt: '전송 완료 후 거래 영수증 스크린샷을 저장하고 다음 단계에서 업로드하세요.', continueReceipt: '영수증 단계로 계속',
  uploadReceipt: '결제 영수증 업로드', uploadReceiptDesc: '완료된 결제를 확인할 수 있는 선명한 스크린샷 또는 PDF를 업로드하세요. 영수증은 비공개로 저장되며 PlayCrows 팀이 검토합니다.', selectReceipt: '결제 영수증 선택', acceptedFormats: '지원 형식: JPG, PNG, WEBP, PDF. 최대 파일 크기: 5MB.', chooseFile: '파일 선택', pdfSelected: 'PDF 영수증 선택됨', additionalNotes: '추가 메모', additionalNotesDesc: 'PlayCrows 팀에 전달할 선택 사항이나 정보를 입력하세요.', additionalNotesPlaceholder: '추가 메모 입력...', receiptVisibility: '결제 서비스에서 제공하는 경우 금액, 수취인, 거래 날짜, 거래 ID가 보이도록 해 주세요.', continueReview: '검토 단계로 계속', invalidReceiptType: 'JPG, PNG, WEBP, PDF 영수증만 허용됩니다.', invalidReceiptSize: '영수증은 0바이트보다 크고 5MB 이하여야 합니다.', receiptRequired: '계속하려면 결제 영수증을 업로드하세요.', receiptPreview: '결제 영수증 미리보기',
  reviewSubmission: '신청 내용 확인', reviewSubmissionDesc: '후원 신청을 보내기 전에 아래 정보를 확인하세요.', donationDetails: '후원 정보', playerId: '플레이어 ID', giftPackageCredit: '패키지 / 누적 크레딧', originalPayment: '원래 결제 금액', discount: '할인', selectedPackageLabel: '선택한 패키지', notSelected: '선택 안 됨', package: '패키지', paymentMethod: '결제 수단', paymentReceipt: '결제 영수증', notUploaded: '업로드 안 됨', none: '없음', whatNext: '다음 단계는?', whatNextDesc: 'PlayCrows 팀이 결제와 영수증을 확인하는 동안 신청은 대기 상태로 표시됩니다. 제출 후 표시되는 참조 코드를 보관하세요.', cumulativeCreditDesc: '누적 보상 크레딧은 할인된 결제 금액이 아니라 패키지의 전체 금액을 기준으로 합니다.', submitting: '제출 중…', submitDonation: '후원 신청 제출',
  receiptSuccess: '결제 영수증 제출 완료!', thankSupport: 'PlayCrows를 후원해 주셔서 감사합니다!', receiptSuccessDesc: '현재 결제 확인을 기다리고 있습니다. 결제가 확인되면 후원이 처리됩니다.', keepReceipt: '거래가 확인될 때까지 결제 영수증을 보관해 주세요.', anotherTransaction: '다른 거래 진행',
  promoEnded: en.promoEnded, invalidRedeem: '유효하지 않은 프로모션 코드입니다.', promoNotEligible: 'EARLY10은 대상 패키지에만 적용됩니다.', promoApplied: 'EARLY10이 적용되었습니다. 전체 패키지와 누적 크레딧은 유지되며 결제 금액은 10% 할인됩니다.', promoExpiredReview: 'EARLY10 프로모션이 종료되었습니다. 제출 전에 일반 결제 금액을 확인하세요.', unableSubmit: '후원 신청을 제출할 수 없습니다. 다시 시도해 주세요.', missingIcon: '아이콘 없음', iconUnavailable: '아이콘을 사용할 수 없음', viewRewards: '보상 보기', close: '닫기',
}

const th: TranslationTable = {
  ...en,
  developmentTeam: 'โดยทีมพัฒนา PlayCrows', donationSubmitted: 'ส่งแบบฟอร์มสนับสนุนแล้ว', donationSubmittedDesc: 'คำขอของคุณกำลังรอตรวจสอบ โปรดเก็บรหัสอ้างอิงด้านล่างไว้หากต้องติดต่อทีม PlayCrows', referenceCode: 'รหัสอ้างอิง', submitAnother: 'ส่งแบบฟอร์มใหม่', webShop: 'WEB Shop', supportAmount: 'ยอดสนับสนุน', cumulativeRewards: 'รางวัลสะสม', changePackageHint: 'ใช้เปลี่ยนแพ็กเกจเพื่อเลือกแพ็กเกจอื่น', choosePackageHint: 'เลือกแพ็กเกจ', chooseSupportHint: 'เลือกสกุลเงินและจำนวนแพ็กเกจ', selectPackageFirst: 'กรุณาเลือกแพ็กเกจก่อน', initialPackage: 'แพ็กเกจที่เลือก', packageSelectionDesc: 'เลือกสกุลเงินและจำนวนด้านล่าง', changePackage: 'เปลี่ยนแพ็กเกจ', voluntaryFooter: '2026 ทีมพัฒนา PlayCrows - การสนับสนุนทั้งหมดเป็นความสมัครใจ',
  currency: 'สกุลเงิน', supportPackages: 'แพ็กเกจสนับสนุน', augustSupplyPackages: 'แพ็กเกจเสบียงเดือนสิงหาคม', augustSupplyPackage: 'แพ็กเกจเสบียงเดือนสิงหาคม', augustSupplyPackagesDesc: 'แพ็กเกจเสบียงพิเศษประจำเดือนสิงหาคม พร้อมทรัพยากรและวัสดุเสริมพลัง', currencyDesc: 'แพ็กเกจ Diamond ที่มีใน WEB Shop', supportPackagesDesc: 'ชุดไอเทมสำหรับการสนับสนุนโดยตรง', webShopIntro: 'เลือกหมวดหมู่ด้านล่างเพื่อค้นหาแพ็กเกจได้ง่ายขึ้น', supportPackage: 'แพ็กเกจสนับสนุน', selected: 'เลือกแล้ว', select: 'เลือก', packageContinueNotice: 'เลือกแพ็กเกจเพื่อดำเนินการต่อ ไอเทม Bound ไม่สามารถซื้อขายหรือโอนได้',
  cumulativeIntro: 'ตรวจสอบรางวัลของแต่ละระดับการสนับสนุนสะสม เลือกระดับเพื่อดูรายการรางวัลทั้งหมด', claimCumulative: 'รับรางวัลสะสม', milestones: 'ระดับ', startingTier: 'ระดับเริ่มต้น', highestTier: 'ระดับสูงสุด', cumulativeMilestone: 'ระดับสนับสนุนสะสม', reward: 'รางวัล', rewards: 'รางวัล', cumulativeNotice: 'รางวัลสะสมจะแสดงตามระดับ หากต้องการยืนยันสิทธิ์หรือการแจกจ่าย โปรดติดต่อฝ่ายสนับสนุน PlayCrows',
  stepAmount: 'ยอดเงิน', stepPlayerInfo: 'ข้อมูลผู้เล่น', stepPayment: 'ชำระเงิน', stepReceipt: 'ใบเสร็จ', stepComplete: 'เสร็จสิ้น', supportAmountTitle: 'ยอดสนับสนุน', supportAmountDesc: 'เลือกสกุลเงินและจำนวนแพ็กเกจที่ต้องการซื้อ', selectedPackage: 'แพ็กเกจที่เลือก', each: 'ต่อชุด', quantity: 'จำนวน', decreaseQuantity: 'ลดจำนวน', increaseQuantity: 'เพิ่มจำนวน', quantityExample: 'ตัวอย่าง: จำนวน 10 คือซื้อแพ็กเกจที่เลือก 10 ชุด', totalPayment: 'ยอดชำระทั้งหมด', usdEquivalent: 'เทียบเท่า USD', continue: 'ดำเนินการต่อ',
  playerInformation: 'ข้อมูลผู้เล่น', playerInformationDesc: 'ก่อนดำเนินการต่อ กรุณากรอกข้อมูลบัญชี PlayCrows เพื่อให้เราระบุบัญชีและดำเนินการสนับสนุนได้ถูกต้อง', username: 'ชื่อผู้ใช้', loginIdPlaceholder: 'กรอก Login ID', characterName: 'ชื่อตัวละคร', characterPlaceholder: 'กรอกชื่อตัวละครในเกม', back: 'ย้อนกลับ', continuePayment: 'ไปยังการชำระเงิน', choosePayment: 'เลือกวิธีชำระเงิน', choosePaymentDesc: 'เลือกวิธีและทำตามคำแนะนำเพื่อชำระเงินให้เสร็จ', amountToPay: 'ยอดที่ต้องชำระ', amount: 'ยอดเงิน', discountApplied: 'ใช้ส่วนลดแล้ว', redeemCode: 'โค้ดโปรโมชั่น', redeemDesc: 'กรอกโค้ดโปรโมชั่นที่ถูกต้องก่อนเลือกวิธีชำระเงิน', enterRedeem: 'กรอกโค้ด', remove: 'นำออก', applyCode: 'ใช้โค้ด', appliedSuccessfully: 'ใช้สำเร็จ', pay: 'ชำระ', receiveFullPackage: 'และรับแพ็กเกจเต็มพร้อมเครดิตรางวัลสะสม', redeemRemoved: 'นำโค้ดโปรโมชั่นออกแล้ว', earlyPromotionEnded: 'โปรโมชั่น Early Donation สิ้นสุดแล้ว', paypalDesc: 'ชำระอย่างปลอดภัยผ่าน PayPal', gcashDesc: 'ชำระผ่าน GCash', wiseDesc: 'ชำระผ่าน Wise QR หรือ Wisetag', bybitDesc: 'โอนภายในหรือโอน USDT ผ่าน TRC20', paymentDetails: 'รายละเอียดการชำระเงิน', scanGcash: 'สแกน QR ด้วยแอป GCash เพื่อชำระเงิน', accountName: 'ชื่อบัญชี', accountNumber: 'เลขบัญชี', paypalInstructions: 'คำแนะนำสำคัญสำหรับ PayPal', paypalFriendsFamily: 'เมื่อชำระผ่าน PayPal กรุณาเลือก Friends and Family หากมีตัวเลือกนี้', paypalCorrectType: 'โปรดตรวจสอบว่าเลือกประเภทการชำระเงินถูกต้องก่อนทำรายการ', paypalEmail: 'อีเมล PayPal', openPaypal: 'เปิด PayPal', scanWise: 'สแกน QR ด้วยโทรศัพท์หรือเปิดลิงก์ Wise ด้านล่าง', wisetag: 'Wisetag', openWise: 'เปิด Wise', saveScreenshotNext: 'หลังชำระเงิน โปรดบันทึกภาพหน้าจอรายการและอัปโหลดในขั้นตอนถัดไป', chooseBybitMethod: 'เลือกวิธีโอน Bybit', bybitMethodDesc: 'สามารถโอนผ่าน Bybit UID ภายใน หรือส่ง USDT ผ่านเครือข่าย TRC20', bybitInternal: 'โอนภายใน Bybit', bybitUidDesc: 'ใช้ UID นี้เมื่อโอนจากบัญชี Bybit อื่น', bybitUid: 'Bybit UID', or: 'หรือ', usdtOnchain: 'โอน USDT On-Chain', usdtDesc: 'สแกน QR หรือกรอกที่อยู่ Wallet ด้วยตนเอง', asset: 'สินทรัพย์', network: 'เครือข่าย', walletAddress: 'ที่อยู่ Wallet', networkWarning: 'คำเตือนเครือข่าย', networkWarningDesc: 'ส่งเฉพาะ USDT ผ่านเครือข่าย TRC20 เท่านั้น การใช้สินทรัพย์หรือเครือข่ายอื่นอาจทำให้เงินสูญหายถาวร', saveTransferReceipt: 'หลังโอนเสร็จ โปรดบันทึกภาพหน้าจอใบเสร็จและอัปโหลดในขั้นตอนถัดไป', continueReceipt: 'ไปยังใบเสร็จ', uploadReceipt: 'อัปโหลดใบเสร็จการชำระเงิน', uploadReceiptDesc: 'อัปโหลดภาพหน้าจอหรือ PDF ที่ชัดเจนของการชำระเงิน ใบเสร็จจะถูกเก็บเป็นส่วนตัวและตรวจสอบโดยทีม PlayCrows', selectReceipt: 'เลือกใบเสร็จ', acceptedFormats: 'รองรับ JPG, PNG, WEBP หรือ PDF ขนาดสูงสุด 5 MB', chooseFile: 'เลือกไฟล์', pdfSelected: 'เลือกใบเสร็จ PDF แล้ว', additionalNotes: 'หมายเหตุเพิ่มเติม', additionalNotesDesc: 'เพิ่มคำแนะนำหรือข้อมูลเพิ่มเติมสำหรับทีม PlayCrows (ไม่บังคับ)', additionalNotesPlaceholder: 'กรอกหมายเหตุเพิ่มเติม...', receiptVisibility: 'ตรวจสอบให้ยอดเงิน ผู้รับ วันที่ทำรายการ และ Transaction ID มองเห็นได้หากผู้ให้บริการแสดงข้อมูลเหล่านี้', continueReview: 'ไปยังตรวจสอบ', invalidReceiptType: 'อนุญาตเฉพาะ JPG, PNG, WEBP และ PDF', invalidReceiptSize: 'ไฟล์ต้องมีขนาดมากกว่า 0 ไบต์และไม่เกิน 5 MB', receiptRequired: 'กรุณาอัปโหลดใบเสร็จก่อนดำเนินการต่อ', receiptPreview: 'ตัวอย่างใบเสร็จ', reviewSubmission: 'ตรวจสอบข้อมูล', reviewSubmissionDesc: 'ตรวจสอบข้อมูลด้านล่างก่อนส่งแบบฟอร์มสนับสนุน', donationDetails: 'รายละเอียดการสนับสนุน', playerId: 'Player ID', giftPackageCredit: 'แพ็กเกจ / เครดิตสะสม', originalPayment: 'ยอดเดิม', discount: 'ส่วนลด', selectedPackageLabel: 'แพ็กเกจที่เลือก', notSelected: 'ยังไม่ได้เลือก', package: 'แพ็กเกจ', paymentMethod: 'วิธีชำระเงิน', paymentReceipt: 'ใบเสร็จ', notUploaded: 'ยังไม่ได้อัปโหลด', none: 'ไม่มี', whatNext: 'ขั้นตอนต่อไป?', whatNextDesc: 'คำขอจะอยู่ในสถานะรอตรวจสอบระหว่างที่ทีม PlayCrows ตรวจสอบการชำระเงินและใบเสร็จ โปรดเก็บรหัสอ้างอิงหลังส่ง', cumulativeCreditDesc: 'เครดิตรางวัลสะสมจะอิงมูลค่าเต็มของแพ็กเกจ ไม่ใช่ยอดหลังส่วนลด', submitting: 'กำลังส่ง…', submitDonation: 'ส่งแบบฟอร์ม', receiptSuccess: 'ส่งใบเสร็จสำเร็จ!', thankSupport: 'ขอบคุณที่สนับสนุน PlayCrows!', receiptSuccessDesc: 'การชำระเงินกำลังรอตรวจสอบ เมื่อยืนยันแล้วการสนับสนุนจะถูกดำเนินการ', keepReceipt: 'โปรดเก็บใบเสร็จไว้จนกว่ารายการจะได้รับการยืนยัน', anotherTransaction: 'ทำรายการใหม่', promoEnded: en.promoEnded, invalidRedeem: 'โค้ดไม่ถูกต้อง', promoNotEligible: 'EARLY10 ใช้ได้เฉพาะแพ็กเกจที่กำหนด', promoApplied: 'ใช้ EARLY10 แล้ว คุณจะชำระน้อยลง 10% และยังได้รับแพ็กเกจเต็มพร้อมเครดิตสะสม', promoExpiredReview: 'โปรโมชั่น EARLY10 หมดอายุแล้ว โปรดตรวจสอบยอดปกติก่อนส่ง', unableSubmit: 'ไม่สามารถส่งแบบฟอร์มได้ กรุณาลองใหม่', missingIcon: 'ไม่มีไอคอน', iconUnavailable: 'ไม่สามารถแสดงไอคอนได้', viewRewards: 'ดูรางวัล', close: 'ปิด',
}

const pt: TranslationTable = {
  ...en,
  developmentTeam: 'pela Equipe de Desenvolvimento PlayCrows', donationSubmitted: 'Formulário de doação enviado', donationSubmittedDesc: 'Seu envio está aguardando análise. Guarde o código de referência abaixo caso precise entrar em contato com o suporte PlayCrows.', referenceCode: 'Código de referência', submitAnother: 'Enviar outro formulário', webShop: 'WEB Shop', supportAmount: 'Valor de apoio', cumulativeRewards: 'Recompensas cumulativas', changePackageHint: 'Use Alterar Pacote para escolher outro pacote', choosePackageHint: 'Escolha um pacote', chooseSupportHint: 'Escolha a moeda e a quantidade do pacote', selectPackageFirst: 'Selecione um pacote primeiro', initialPackage: 'Pacote selecionado', packageSelectionDesc: 'Escolha abaixo a moeda e a quantidade.', changePackage: 'Alterar pacote', voluntaryFooter: '2026 Equipe de Desenvolvimento PlayCrows - Todas as contribuições são voluntárias.',
  currency: 'Moeda', supportPackages: 'Pacotes de Suporte', augustSupplyPackages: 'Pacotes de Suprimentos de Agosto', augustSupplyPackage: 'Pacote de Suprimentos de Agosto', augustSupplyPackagesDesc: 'Pacotes limitados de agosto com recursos bônus e materiais de aprimoramento.', currencyDesc: 'Pacotes de Diamonds disponíveis na WEB Shop.', supportPackagesDesc: 'Pacotes de itens disponíveis para apoio direto.', webShopIntro: 'Selecione uma categoria abaixo para encontrar os pacotes com facilidade.', supportPackage: 'Pacote de Suporte', selected: 'Selecionado', select: 'Selecionar', packageContinueNotice: 'Selecione um pacote para continuar. Itens vinculados não podem ser negociados ou transferidos.', cumulativeIntro: 'Veja as recompensas de cada marco de apoio cumulativo. Selecione um marco para abrir a lista completa.', claimCumulative: 'Resgatar Recompensas Cumulativas', milestones: 'Marcos', startingTier: 'Nível inicial', highestTier: 'Nível máximo', cumulativeMilestone: 'Marco de apoio cumulativo', reward: 'recompensa', rewards: 'recompensas', cumulativeNotice: 'As recompensas cumulativas são exibidas por marco. Entre em contato com o suporte PlayCrows se precisar confirmar elegibilidade ou distribuição.', stepAmount: 'Valor', stepPlayerInfo: 'Dados do jogador', stepPayment: 'Pagamento', stepReceipt: 'Comprovante', stepComplete: 'Concluir', supportAmountTitle: 'Valor de apoio', supportAmountDesc: 'Escolha a moeda de pagamento e quantas unidades do pacote selecionado deseja.', selectedPackage: 'Pacote selecionado', each: 'cada', quantity: 'Quantidade', decreaseQuantity: 'Diminuir quantidade', increaseQuantity: 'Aumentar quantidade', quantityExample: 'Exemplo: quantidade 10 compra 10 unidades do pacote selecionado.', totalPayment: 'Pagamento total', usdEquivalent: 'Equivalente em USD', continue: 'Continuar', playerInformation: 'Informações do jogador', playerInformationDesc: 'Antes de continuar, informe seus dados da conta PlayCrows. Isso nos permite identificar sua conta e processar sua contribuição corretamente.', username: 'Usuário', loginIdPlaceholder: 'Digite seu Login ID', characterName: 'Nome do personagem', characterPlaceholder: 'Digite o nome do personagem no jogo', back: 'Voltar', continuePayment: 'Continuar para pagamento', choosePayment: 'Escolha o método de pagamento', choosePaymentDesc: 'Selecione um método e siga as instruções para concluir o pagamento.', amountToPay: 'Valor a pagar', amount: 'Valor', discountApplied: 'desconto aplicado', redeemCode: 'Código promocional', redeemDesc: 'Insira um código promocional válido antes de selecionar o método de pagamento.', enterRedeem: 'Digite o código', remove: 'Remover', applyCode: 'Aplicar código', appliedSuccessfully: 'aplicado com sucesso', pay: 'Pague', receiveFullPackage: 'e receba o pacote completo e o crédito de recompensa cumulativa.', redeemRemoved: 'Código promocional removido.', earlyPromotionEnded: 'A promoção de doação antecipada terminou.', paypalDesc: 'Pague com segurança usando PayPal', gcashDesc: 'Pague usando GCash', wiseDesc: 'Pague usando Wise QR ou Wisetag', bybitDesc: 'Transferência interna ou USDT via TRC20', paymentDetails: 'Detalhes de pagamento', scanGcash: 'Escaneie o QR code no aplicativo GCash para concluir o pagamento.', accountName: 'Nome da conta', accountNumber: 'Número da conta', paypalInstructions: 'Instruções importantes do PayPal', paypalFriendsFamily: 'Ao enviar pelo PayPal, selecione Friends and Family se essa opção estiver disponível.', paypalCorrectType: 'Confirme que o pagamento está usando o tipo correto antes de concluir a transação.', paypalEmail: 'E-mail do PayPal', openPaypal: 'Abrir PayPal', scanWise: 'Escaneie o QR code com o celular ou abra o link de pagamento Wise abaixo.', wisetag: 'Wisetag', openWise: 'Abrir pagamento Wise', saveScreenshotNext: 'Após concluir o pagamento, salve uma captura da transação e envie na próxima etapa.', chooseBybitMethod: 'Escolha um método de transferência Bybit', bybitMethodDesc: 'Você pode usar transferência interna por UID ou enviar USDT pela rede TRC20.', bybitInternal: 'Transferência interna Bybit', bybitUidDesc: 'Use este UID ao transferir de outra conta Bybit.', bybitUid: 'Bybit UID', or: 'Ou', usdtOnchain: 'Transferência USDT On-Chain', usdtDesc: 'Escaneie o QR code ou digite o endereço da carteira manualmente.', asset: 'Ativo', network: 'Rede', walletAddress: 'Endereço da carteira', networkWarning: 'Aviso importante de rede', networkWarningDesc: 'Envie somente USDT pela rede TRC20. Usar outro ativo ou rede pode causar perda permanente dos fundos.', saveTransferReceipt: 'Após concluir a transferência, salve uma captura do comprovante e envie na próxima etapa.', continueReceipt: 'Continuar para comprovante', uploadReceipt: 'Enviar comprovante de pagamento', uploadReceiptDesc: 'Envie uma captura clara ou PDF mostrando o pagamento concluído. O comprovante será armazenado de forma privada e analisado pela equipe PlayCrows.', selectReceipt: 'Selecione seu comprovante', acceptedFormats: 'Formatos aceitos: JPG, PNG, WEBP ou PDF. Tamanho máximo: 5 MB.', chooseFile: 'Escolher arquivo', pdfSelected: 'Comprovante PDF selecionado', additionalNotes: 'Observações adicionais', additionalNotesDesc: 'Adicione instruções ou informações opcionais para a equipe PlayCrows.', additionalNotesPlaceholder: 'Digite observações adicionais...', receiptVisibility: 'Certifique-se de que valor, destinatário, data e ID da transação estejam visíveis quando o provedor os exibir.', continueReview: 'Continuar para revisão', invalidReceiptType: 'Somente comprovantes JPG, PNG, WEBP e PDF são permitidos.', invalidReceiptSize: 'O comprovante deve ter mais de 0 bytes e no máximo 5 MB.', receiptRequired: 'Envie o comprovante antes de continuar.', receiptPreview: 'Prévia do comprovante', reviewSubmission: 'Revise seu envio', reviewSubmissionDesc: 'Confirme as informações abaixo antes de enviar o formulário para análise.', donationDetails: 'Detalhes da doação', playerId: 'Player ID', giftPackageCredit: 'Pacote / Crédito cumulativo', originalPayment: 'Valor original', discount: 'Desconto', selectedPackageLabel: 'Pacote selecionado', notSelected: 'Não selecionado', package: 'Pacote', paymentMethod: 'Método de pagamento', paymentReceipt: 'Comprovante', notUploaded: 'Não enviado', none: 'Nenhuma', whatNext: 'O que acontece agora?', whatNextDesc: 'Seu envio ficará pendente enquanto a equipe PlayCrows verifica o pagamento e o comprovante. Guarde o código de referência mostrado após o envio.', cumulativeCreditDesc: 'Seu crédito cumulativo usará o valor total do pacote, não o valor com desconto.', submitting: 'Enviando…', submitDonation: 'Enviar formulário', receiptSuccess: 'Comprovante enviado com sucesso!', thankSupport: 'Obrigado por apoiar o PlayCrows!', receiptSuccessDesc: 'Seu pagamento está aguardando verificação. Após a confirmação, sua contribuição será processada.', keepReceipt: 'Guarde seu comprovante até a transação ser verificada.', anotherTransaction: 'Fazer outra transação', promoEnded: en.promoEnded, invalidRedeem: 'Código promocional inválido.', promoNotEligible: 'EARLY10 aplica-se somente aos pacotes elegíveis.', promoApplied: 'EARLY10 aplicado. Você pagará 10% menos e receberá o pacote completo e o crédito cumulativo.', promoExpiredReview: 'A promoção EARLY10 expirou. Confira o valor normal antes de enviar.', unableSubmit: 'Não foi possível enviar o formulário. Tente novamente.', missingIcon: 'Ícone ausente', iconUnavailable: 'ícone indisponível', viewRewards: 'Ver recompensas', close: 'Fechar',
}

const zhTW: TranslationTable = {
  ...en,
  developmentTeam: '由 PlayCrows 開發團隊製作', donationSubmitted: '贊助表單已送出', donationSubmittedDesc: '您的申請正在等待審核。若需要聯絡 PlayCrows 支援，請保留下方的參考代碼。', referenceCode: '參考代碼', submitAnother: '再次提交表單', webShop: 'WEB 商店', supportAmount: '贊助金額', cumulativeRewards: '累積獎勵', changePackageHint: '使用變更方案來選擇其他方案', choosePackageHint: '選擇方案', chooseSupportHint: '選擇幣別與方案數量', selectPackageFirst: '請先選擇方案', initialPackage: '已選方案', packageSelectionDesc: '請在下方選擇付款幣別與數量。', changePackage: '變更方案', voluntaryFooter: '2026 PlayCrows 開發團隊 - 所有贊助皆為自願支持。', currency: '貨幣', supportPackages: '支援方案', augustSupplyPackages: '八月補給方案', augustSupplyPackage: '八月補給方案', augustSupplyPackagesDesc: '八月限定補給組合，包含額外資源與強化材料。', currencyDesc: 'WEB 商店目前提供的 Diamond 方案。', supportPackagesDesc: '可直接贊助購買的道具組合。', webShopIntro: '請選擇下方分類以快速查找可用方案。', supportPackage: '支援方案', selected: '已選擇', select: '選擇', packageContinueNotice: '請選擇方案以繼續。綁定道具不可交易或轉移。', cumulativeIntro: '查看各累積贊助里程碑的獎勵。選擇里程碑即可展開完整獎勵清單。', claimCumulative: '領取累積獎勵', milestones: '里程碑', startingTier: '起始級距', highestTier: '最高級距', cumulativeMilestone: '累積贊助里程碑', reward: '項獎勵', rewards: '項獎勵', cumulativeNotice: '累積獎勵依里程碑顯示。如需確認資格或獎勵發放，請聯絡 PlayCrows 支援。', stepAmount: '金額', stepPlayerInfo: '玩家資料', stepPayment: '付款', stepReceipt: '收據', stepComplete: '完成', supportAmountTitle: '贊助金額', supportAmountDesc: '選擇付款幣別以及要購買的方案數量。', selectedPackage: '已選方案', each: '每份', quantity: '數量', decreaseQuantity: '減少數量', increaseQuantity: '增加數量', quantityExample: '範例：數量 10 代表購買 10 份所選方案。', totalPayment: '付款總額', usdEquivalent: 'USD 等值', continue: '繼續', playerInformation: '玩家資料', playerInformationDesc: '繼續之前，請輸入您的 PlayCrows 帳號資訊，以便我們正確識別帳號並處理您的贊助。', username: '登入帳號', loginIdPlaceholder: '輸入 Login ID', characterName: '角色名稱', characterPlaceholder: '輸入遊戲內角色名稱', back: '返回', continuePayment: '前往付款', choosePayment: '選擇付款方式', choosePaymentDesc: '選擇付款方式並依照說明完成付款。', amountToPay: '應付金額', amount: '金額', discountApplied: '已套用折扣', redeemCode: '優惠代碼', redeemDesc: '選擇付款方式前，請輸入有效的優惠代碼。', enterRedeem: '輸入優惠代碼', remove: '移除', applyCode: '套用代碼', appliedSuccessfully: '套用成功', pay: '支付', receiveFullPackage: '並獲得完整方案與累積獎勵額度。', redeemRemoved: '優惠代碼已移除。', earlyPromotionEnded: '早鳥贊助活動已結束。', paypalDesc: '使用 PayPal 安全付款', gcashDesc: '使用 GCash 付款', wiseDesc: '使用 Wise QR 或 Wisetag 付款', bybitDesc: 'Bybit 內部轉帳或透過 TRC20 轉 USDT', paymentDetails: '付款資訊', scanGcash: '使用 GCash App 掃描 QR Code 完成付款。', accountName: '帳戶名稱', accountNumber: '帳戶號碼', paypalInstructions: '重要 PayPal 付款說明', paypalFriendsFamily: '使用 PayPal 付款時，如有提供此選項，請選擇 Friends and Family。', paypalCorrectType: '完成交易前請確認使用正確的付款類型。', paypalEmail: 'PayPal 電子郵件', openPaypal: '開啟 PayPal', scanWise: '使用手機掃描 QR Code，或開啟下方 Wise 付款連結。', wisetag: 'Wisetag', openWise: '開啟 Wise 付款', saveScreenshotNext: '付款完成後，請儲存交易截圖並在下一步上傳。', chooseBybitMethod: '選擇 Bybit 轉帳方式', bybitMethodDesc: '可使用 Bybit UID 內部轉帳，或透過 TRC20 網路轉送 USDT。', bybitInternal: 'Bybit 內部轉帳', bybitUidDesc: '從其他 Bybit 帳戶轉帳時請使用此 UID。', bybitUid: 'Bybit UID', or: '或', usdtOnchain: 'USDT 鏈上轉帳', usdtDesc: '掃描 QR Code 或手動輸入錢包地址。', asset: '資產', network: '網路', walletAddress: '錢包地址', networkWarning: '重要網路警告', networkWarningDesc: '僅能透過 TRC20 網路發送 USDT。使用其他資產或網路可能造成永久資金損失。', saveTransferReceipt: '轉帳完成後，請儲存交易收據截圖並在下一步上傳。', continueReceipt: '前往收據', uploadReceipt: '上傳付款收據', uploadReceiptDesc: '上傳清晰的付款完成截圖或 PDF。收據將私密保存並由 PlayCrows 團隊審核。', selectReceipt: '選擇付款收據', acceptedFormats: '支援 JPG、PNG、WEBP 或 PDF，檔案上限 5 MB。', chooseFile: '選擇檔案', pdfSelected: '已選擇 PDF 收據', additionalNotes: '附加備註', additionalNotesDesc: '可選填給 PlayCrows 團隊的說明或資訊。', additionalNotesPlaceholder: '輸入附加備註...', receiptVisibility: '若付款平台有顯示，請確保金額、收款人、交易日期與交易 ID 清楚可見。', continueReview: '前往確認', invalidReceiptType: '僅允許 JPG、PNG、WEBP 與 PDF 收據。', invalidReceiptSize: '收據檔案必須大於 0 bytes 且不超過 5 MB。', receiptRequired: '請先上傳付款收據再繼續。', receiptPreview: '付款收據預覽', reviewSubmission: '確認提交內容', reviewSubmissionDesc: '送出贊助表單前，請確認下方資訊。', donationDetails: '贊助明細', playerId: '玩家 ID', giftPackageCredit: '方案 / 累積額度', originalPayment: '原始付款金額', discount: '折扣', selectedPackageLabel: '已選方案', notSelected: '未選擇', package: '方案', paymentMethod: '付款方式', paymentReceipt: '付款收據', notUploaded: '未上傳', none: '無', whatNext: '接下來呢？', whatNextDesc: 'PlayCrows 團隊確認付款與收據期間，您的申請會標示為待處理。請保留提交後顯示的參考代碼。', cumulativeCreditDesc: '累積獎勵額度會依方案完整價值計算，而不是折扣後付款金額。', submitting: '提交中…', submitDonation: '提交贊助表單', receiptSuccess: '付款收據提交成功！', thankSupport: '感謝您支持 PlayCrows！', receiptSuccessDesc: '您的付款正在等待驗證。確認付款後，您的贊助將會進行處理。', keepReceipt: '請保留付款收據，直到交易成功驗證。', anotherTransaction: '進行另一筆交易', promoEnded: en.promoEnded, invalidRedeem: '優惠代碼無效。', promoNotEligible: 'EARLY10 僅適用於符合資格的方案。', promoApplied: 'EARLY10 已套用。您將少付 10%，並仍獲得完整方案與累積額度。', promoExpiredReview: 'EARLY10 活動已結束。提交前請確認一般付款金額。', unableSubmit: '無法提交贊助表單，請再試一次。', missingIcon: '缺少圖示', iconUnavailable: '圖示無法使用', viewRewards: '查看獎勵', close: '關閉',
}

const ru: TranslationTable = {
  ...en,
  developmentTeam: 'от команды разработчиков PlayCrows',
  donationSubmitted: 'Форма пожертвования отправлена',
  donationSubmittedDesc: 'Ваша заявка ожидает проверки. Сохраните код ниже на случай обращения в поддержку PlayCrows.',
  referenceCode: 'Код заявки',
  submitAnother: 'Отправить другую форму',
  webShop: 'WEB Shop',
  supportAmount: 'Сумма поддержки',
  cumulativeRewards: 'Накопительные награды',
  changePackageHint: 'Используйте «Сменить пакет», чтобы выбрать другой пакет',
  choosePackageHint: 'Выберите пакет',
  chooseSupportHint: 'Выберите валюту и количество пакетов',
  selectPackageFirst: 'Сначала выберите пакет',
  initialPackage: 'Выбранный пакет',
  packageSelectionDesc: 'Выберите валюту оплаты и количество ниже.',
  changePackage: 'Сменить пакет',
  voluntaryFooter: '2026 PlayCrows Development Team — все взносы являются добровольной поддержкой.',
  promoEnded: 'Акция EARLY10 завершилась 31 июля 2026 года в 15:00 по сингапурскому времени.',
  invalidRedeem: 'Неверный промокод.',
  promoNotEligible: 'EARLY10 действует только для подходящих подарочных пакетов.',
  promoApplied: 'EARLY10 применён. Вы заплатите на 10% меньше и получите полный пакет и накопительный кредит.',
  promoExpiredReview: 'Акция EARLY10 завершилась. Проверьте обычную сумму оплаты перед отправкой.',
  unableSubmit: 'Не удалось отправить форму пожертвования. Попробуйте ещё раз.',

  currency: 'Валюта',
  supportPackages: 'Пакеты поддержки',
  augustSupplyPackages: 'Августовские наборы снабжения',
  augustSupplyPackage: 'Августовский набор снабжения',
  augustSupplyPackagesDesc: 'Ограниченные августовские наборы с бонусными ресурсами и материалами усиления.',
  currencyDesc: 'Пакеты Diamond, доступные в WEB Shop.',
  supportPackagesDesc: 'Наборы предметов для прямой поддержки проекта.',
  webShopIntro: 'Выберите категорию ниже для быстрого просмотра доступных пакетов.',
  supportPackage: 'Пакет поддержки',
  selected: 'Выбрано',
  select: 'Выбрать',
  packageContinueNotice: 'Выберите пакет, чтобы продолжить. Привязанные предметы нельзя обменивать или передавать.',
  missingIcon: 'Иконка отсутствует',
  iconUnavailable: 'иконка недоступна',
  viewRewards: 'Посмотреть награды',
  close: 'Закрыть',

  cumulativeIntro: 'Просмотрите награды за каждый уровень накопительной поддержки. Выберите уровень, чтобы открыть полный список наград.',
  claimCumulative: 'Получить накопительные награды',
  milestones: 'Уровни',
  startingTier: 'Начальный уровень',
  highestTier: 'Максимальный уровень',
  cumulativeMilestone: 'Уровень накопительной поддержки',
  reward: 'награда',
  rewards: 'наград',
  cumulativeNotice: 'Содержимое накопительных наград отображается по уровням. Если вам нужно подтверждение права на награду или её выдачи, обратитесь в поддержку PlayCrows.',

  stepAmount: 'Сумма',
  stepPlayerInfo: 'Данные игрока',
  stepPayment: 'Оплата',
  stepReceipt: 'Квитанция',
  stepComplete: 'Готово',

  supportAmountTitle: 'Сумма поддержки',
  supportAmountDesc: 'Выберите валюту оплаты и количество выбранных пакетов.',
  selectedPackage: 'Выбранный пакет',
  each: 'за шт.',
  quantity: 'Количество',
  decreaseQuantity: 'Уменьшить количество',
  increaseQuantity: 'Увеличить количество',
  quantityExample: 'Пример: количество 10 означает покупку 10 копий выбранного пакета.',
  totalPayment: 'Итого к оплате',
  usdEquivalent: 'Эквивалент в USD',
  continue: 'Продолжить',

  playerInformation: 'Информация об игроке',
  playerInformationDesc: 'Перед продолжением введите данные вашей учётной записи PlayCrows. Это поможет нам правильно определить аккаунт и обработать вашу поддержку.',
  username: 'Логин',
  loginIdPlaceholder: 'Введите Login ID',
  characterName: 'Имя персонажа',
  characterPlaceholder: 'Введите имя персонажа в игре',
  back: 'Назад',
  continuePayment: 'Перейти к оплате',

  choosePayment: 'Выберите способ оплаты',
  choosePaymentDesc: 'Выберите способ и следуйте инструкциям для завершения оплаты.',
  amountToPay: 'Сумма к оплате',
  amount: 'Сумма',
  discountApplied: 'скидка применена',
  redeemCode: 'Промокод',
  redeemDesc: 'Введите действующий промокод перед выбором способа оплаты.',
  enterRedeem: 'Введите промокод',
  remove: 'Удалить',
  applyCode: 'Применить код',
  appliedSuccessfully: 'успешно применён',
  pay: 'Оплатить',
  receiveFullPackage: 'и получить полный пакет и накопительный кредит.',
  redeemRemoved: 'Промокод удалён.',
  earlyPromotionEnded: 'Ранняя акция поддержки завершена.',
  paypalDesc: 'Безопасная оплата через PayPal',
  gcashDesc: 'Оплата через GCash',
  wiseDesc: 'Оплата через Wise QR или Wisetag',
  bybitDesc: 'Внутренний перевод или перевод USDT через TRC20',
  paymentDetails: 'Платёжные данные',
  scanGcash: 'Отсканируйте QR-код в приложении GCash, чтобы завершить оплату.',
  accountName: 'Имя владельца',
  accountNumber: 'Номер счёта',
  paypalInstructions: 'Важные инструкции по оплате PayPal',
  paypalFriendsFamily: 'При отправке платежа через PayPal выберите Friends and Family, если эта опция доступна.',
  paypalCorrectType: 'Перед завершением операции убедитесь, что выбран правильный тип платежа.',
  paypalEmail: 'Email PayPal',
  openPaypal: 'Открыть PayPal',
  scanWise: 'Отсканируйте QR-код телефоном или откройте ссылку Wise ниже.',
  wisetag: 'Wisetag',
  openWise: 'Открыть оплату Wise',
  saveScreenshotNext: 'После оплаты сохраните скриншот транзакции и загрузите его на следующем шаге.',
  chooseBybitMethod: 'Выберите способ перевода Bybit',
  bybitMethodDesc: 'Вы можете отправить внутренний перевод по UID Bybit или отправить USDT через сеть TRC20.',
  bybitInternal: 'Внутренний перевод Bybit',
  bybitUidDesc: 'Используйте этот UID при переводе с другого аккаунта Bybit.',
  bybitUid: 'UID Bybit',
  or: 'Или',
  usdtOnchain: 'Ончейн-перевод USDT',
  usdtDesc: 'Отсканируйте QR-код или введите адрес кошелька вручную.',
  asset: 'Актив',
  network: 'Сеть',
  walletAddress: 'Адрес кошелька',
  networkWarning: 'Важное предупреждение о сети',
  networkWarningDesc: 'Отправляйте только USDT через сеть TRC20. Использование другого актива или сети может привести к безвозвратной потере средств.',
  saveTransferReceipt: 'После перевода сохраните скриншот квитанции и загрузите его на следующем шаге.',
  continueReceipt: 'Перейти к квитанции',

  uploadReceipt: 'Загрузить квитанцию об оплате',
  uploadReceiptDesc: 'Загрузите чёткий скриншот или PDF с подтверждением завершённой оплаты. Квитанция будет храниться приватно и проверяться командой PlayCrows.',
  selectReceipt: 'Выберите квитанцию об оплате',
  acceptedFormats: 'Допустимые форматы: JPG, PNG, WEBP или PDF. Максимальный размер файла: 5 МБ.',
  chooseFile: 'Выбрать файл',
  pdfSelected: 'Выбрана PDF-квитанция',
  additionalNotes: 'Дополнительные примечания',
  additionalNotesDesc: 'Добавьте необязательные инструкции или информацию для команды PlayCrows.',
  additionalNotesPlaceholder: 'Введите дополнительные примечания...',
  receiptVisibility: 'Убедитесь, что сумма, получатель, дата транзакции и ID транзакции видны, если платёжный сервис их отображает.',
  continueReview: 'Перейти к проверке',
  invalidReceiptType: 'Разрешены только квитанции JPG, PNG, WEBP и PDF.',
  invalidReceiptSize: 'Размер квитанции должен быть больше 0 байт и не превышать 5 МБ.',
  receiptRequired: 'Загрузите квитанцию об оплате, прежде чем продолжить.',
  receiptPreview: 'Предпросмотр квитанции',

  reviewSubmission: 'Проверьте заявку',
  reviewSubmissionDesc: 'Проверьте информацию ниже перед отправкой формы на рассмотрение.',
  donationDetails: 'Данные пожертвования',
  playerId: 'ID игрока',
  giftPackageCredit: 'Пакет / Накопительный кредит',
  originalPayment: 'Исходная сумма оплаты',
  discount: 'Скидка',
  selectedPackageLabel: 'Выбранный пакет',
  notSelected: 'Не выбрано',
  package: 'Пакет',
  paymentMethod: 'Способ оплаты',
  paymentReceipt: 'Квитанция об оплате',
  notUploaded: 'Не загружено',
  none: 'Нет',
  whatNext: 'Что дальше?',
  whatNextDesc: 'Ваша заявка будет отмечена как ожидающая, пока команда PlayCrows проверяет оплату и квитанцию. Сохраните код заявки, показанный после отправки.',
  cumulativeCreditDesc: 'Накопительный кредит рассчитывается по полной стоимости подарочного пакета, а не по сумме после скидки.',
  submitting: 'Отправка…',
  submitDonation: 'Отправить форму пожертвования',

  receiptSuccess: 'Квитанция об оплате успешно отправлена!',
  thankSupport: 'Спасибо за поддержку PlayCrows!',
  receiptSuccessDesc: 'Ваш платёж ожидает проверки. После подтверждения платежа ваша поддержка будет обработана.',
  keepReceipt: 'Сохраняйте квитанцию об оплате до успешной проверки транзакции.',
  anotherTransaction: 'Совершить другую транзакцию',
}

const translations: Record<LanguageCode, TranslationTable> = {
  en,
  ko,
  th,
  pt,
  'zh-TW': zhTW,
  ru,
}

type I18nContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getInitialLanguage(): LanguageCode {
  const saved = localStorage.getItem('playcrows-language') as LanguageCode | null
  if (saved && LANGUAGES.some(item => item.code === saved)) return saved

  const browser = navigator.language.toLowerCase()
  if (browser.startsWith('ko')) return 'ko'
  if (browser.startsWith('th')) return 'th'
  if (browser.startsWith('pt')) return 'pt'
  if (browser.startsWith('zh')) return 'zh-TW'
  if (browser.startsWith('ru')) return 'ru'
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage)

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next)
    localStorage.setItem('playcrows-language', next)
  }

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: key => translations[language][key] ?? en[key],
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
