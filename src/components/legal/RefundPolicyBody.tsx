export default function RefundPolicyBody() {
    return (
        <div className="legal-prose space-y-10 [&_h2]:mt-12 [&_h2]:scroll-mt-28 [&_h2]:border-b [&_h2]:border-orange-100 [&_h2]:pb-3 [&_h2]:font-playfair [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text-dark [&_h2:first-child]:mt-0 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-text-dark [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-text-dark">
            <section>
                <p className="mb-4 text-sm text-text-light italic">
                    This Refund Policy explains how payments, subscriptions, and refund requests are handled on
                    MyMatch.lk. Please read it together with our Terms of Service.
                </p>
            </section>

            <section id="general-policy">
                <h2>1. General Policy</h2>
                <ul>
                    <li>
                        All membership purchases, subscriptions, and service fees on our platform are{' '}
                        <strong>non-refundable</strong> once payment is successfully processed.
                    </li>
                    <li>
                        By registering and purchasing a plan, users acknowledge that they are paying for access to
                        our services, not for guaranteed outcomes (such as marriage or matches).
                    </li>
                </ul>
            </section>

            <section id="exceptions">
                <h2>2. Exceptions</h2>
                <p>Refunds may be considered only under the following circumstances:</p>
                <ul>
                    <li>
                        <strong>Duplicate payment:</strong> If a user is accidentally charged more than once for the
                        same service.
                    </li>
                    <li>
                        <strong>Technical issues:</strong> If the service was not delivered due to verified technical
                        errors on our platform.
                    </li>
                    <li>
                        <strong>Unauthorized transactions:</strong> If payment was made without the account
                        holder&apos;s consent and verified by the payment provider.
                    </li>
                </ul>
            </section>

            <section id="subscription-cancellations">
                <h2>3. Subscription Cancellations</h2>
                <ul>
                    <li>Users may cancel their subscription at any time.</li>
                    <li>
                        Cancellation prevents future billing but does not entitle the user to a refund for the current
                        billing cycle.
                    </li>
                    <li>Any promotional or discounted plans are strictly non-refundable.</li>
                </ul>
            </section>

            <section id="refund-request-procedure">
                <h2>4. Refund Request Procedure</h2>
                <ul>
                    <li>Refund requests must be submitted within <strong>7 days</strong> of the transaction.</li>
                    <li>
                        Users must email our support team at{' '}
                        <a href="mailto:support@mymatch.lk" className="font-semibold text-primary hover:underline">
                            support@mymatch.lk
                        </a>{' '}
                        with transaction details and the reason for the request.
                    </li>
                    <li>
                        Approved refunds will be processed within <strong>10–15 business days</strong> to the original
                        payment method.
                    </li>
                </ul>
            </section>
        </div>
    );
}
