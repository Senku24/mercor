import { useEffect, useState } from "react";
import { useParams } from "react-router";

export function Interview() {
    const { interviewId } = useParams<{ interviewId: string }>(); 

    useEffect(() => {
        
    }, [interviewId]);
    return (
        <div className="h-screen w-screen flex items-center justify-center">
            Interview
        </div>
    )
}